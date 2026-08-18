import { arrayUnion, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { syncPlayerNameAcrossAllAuctions } from './auctions'
import type {
  BattingType,
  BowlingType,
  Handedness,
  PendingPhotoRequest,
  PlayingRole,
  UserRole,
} from '../types'

export async function updateUserRole(uid: string, role: UserRole) {
  await updateDoc(doc(db, 'users', uid), { role })
}

// Narrower than updateUserRole: Admins, Auction Managers, and Team Managers can
// all promote a viewer to Player (e.g. spotting them in the crowd, or approving
// a self-service request) without the broader role-management access an Admin
// has. Clears playerRequested so the request doesn't linger after approval.
export async function promoteViewerToPlayer(uid: string) {
  await updateDoc(doc(db, 'users', uid), { role: 'player', playerRequested: false })
}

// Self-service: a viewer flags that they'd like to be promoted to Player, so
// admins/managers can spot and approve the request instead of having to
// notice them in a crowd.
export async function requestToBePlayer(uid: string) {
  await updateDoc(doc(db, 'users', uid), { playerRequested: true })
}

export interface ProfileFields {
  displayName: string
  phone: string
  whatsapp: string
  location: string
  battingHandedness?: Handedness
  bowlingHandedness?: Handedness
  playingRole?: PlayingRole
  battingType?: BattingType
  bowlingType?: BowlingType
  jerseyNumber?: number
}

export async function updateOwnProfile(uid: string, profile: ProfileFields) {
  // Firestore's updateDoc rejects `undefined` field values, so drop unset
  // optional fields (e.g. handedness left unselected) instead of sending them.
  const fields = Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, 'users', uid), fields)
  // Push the new name out to every auction this player is linked to — see
  // syncPlayerNameAcrossAllAuctions for why this can't just be read live.
  await syncPlayerNameAcrossAllAuctions(uid, profile.displayName)
}

// `filenPhotoId` is the id returned by uploadToFilen (lib/filen.ts) after the
// file lands in Filen storage — callers upload first, then pass the
// resulting id here. Clears avatarId and the legacy encryptedPhoto field
// since only one photo source is ever active at a time (Avatar.tsx would
// otherwise have to pick a display priority).
export async function updateOwnProfilePhoto(uid: string, filenPhotoId: string | null) {
  await updateDoc(doc(db, 'users', uid), { filenPhotoId, avatarId: null, encryptedPhoto: null })
}

// Sets a preset avatar (see lib/avatars.ts) and clears any uploaded photo —
// the inverse of updateOwnProfilePhoto, for users who'd rather pick one of
// these than upload their own image.
export async function updateOwnAvatar(uid: string, avatarId: string) {
  await updateDoc(doc(db, 'users', uid), { avatarId, filenPhotoId: null, encryptedPhoto: null })
}

// An Admin/Auction Manager proposing a replacement profile photo for someone
// else. `filenPhotoId` must already be uploaded to Filen (see uploadToFilen
// in lib/filen.ts) — this only records the proposal so the target can
// preview and approve/reject it; it never touches their live filenPhotoId
// (enforced by firestore.rules' isRequestingPhotoChange, which restricts
// this write to the pendingPhotoRequest field only). Firestore rejects the
// write if one is already pending, so callers should check
// `!targetUser.pendingPhotoRequest || targetUser.pendingPhotoRequest.status !== 'pending'` first.
export async function requestProfilePhotoChange(
  targetUid: string,
  filenPhotoId: string,
  requestedBy: string,
  requestedByName: string,
) {
  await updateDoc(doc(db, 'users', targetUid), {
    pendingPhotoRequest: {
      filenPhotoId,
      requestedBy,
      requestedByName,
      requestedAt: serverTimestamp(),
      status: 'pending',
    },
  })
}

// The target approving a pending request: applies the proposed photo as
// their real one (same fields updateOwnProfilePhoto touches) and marks the
// request resolved so the requester's outcome listener (see
// PhotoRequestOutcomeToast) picks it up in real time.
export async function approvePhotoRequest(uid: string, request: PendingPhotoRequest) {
  await updateDoc(doc(db, 'users', uid), {
    filenPhotoId: request.filenPhotoId,
    avatarId: null,
    encryptedPhoto: null,
    pendingPhotoRequest: { ...request, status: 'approved', resolvedAt: serverTimestamp() },
  })
}

// The target rejecting a pending request: leaves their live photo untouched,
// only marks the request resolved.
export async function rejectPhotoRequest(uid: string, request: PendingPhotoRequest) {
  await updateDoc(doc(db, 'users', uid), {
    pendingPhotoRequest: { ...request, status: 'rejected', resolvedAt: serverTimestamp() },
  })
}

// The original requester dismissing a resolved (approved/rejected) outcome
// once they've seen it, so it stops showing up in their outcome listener and
// a new request can be sent later. Requester-only (see
// isClearingResolvedPhotoRequest in firestore.rules) — anyone else clearing
// it could hide an outcome from the person who actually needs to see it.
export async function clearPhotoRequestOutcome(uid: string) {
  await updateDoc(doc(db, 'users', uid), { pendingPhotoRequest: null })
}

// Assigning an Auction Manager must also grant them real write access to the
// auction (Firestore rules check auctionManagerIds, not assignedAuctions) —
// otherwise they show up as "assigned" but can't actually set anything up.
export async function assignUserToAuction(
  uid: string,
  auctionId: string,
  currentAssignments: string[],
  role: UserRole,
) {
  const alreadyAssigned = currentAssignments.includes(auctionId)
  if (alreadyAssigned && role !== 'auctionManager') return

  const batch = writeBatch(db)
  if (!alreadyAssigned) {
    batch.update(doc(db, 'users', uid), {
      assignedAuctions: [...currentAssignments, auctionId],
    })
  }
  if (role === 'auctionManager') {
    // arrayUnion is idempotent, so re-running this (e.g. an assignment made
    // before auctionManagerIds existed) safely backfills real write access.
    batch.update(doc(db, 'auctions', auctionId), {
      auctionManagerIds: arrayUnion(uid),
    })
  }
  await batch.commit()
}
