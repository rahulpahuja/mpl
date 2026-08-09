import { arrayUnion, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { UserRole } from '../types'

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
  phone: string
  whatsapp: string
  location: string
}

export async function updateOwnProfile(uid: string, profile: ProfileFields) {
  await updateDoc(doc(db, 'users', uid), { ...profile })
}

// `encryptedPhoto` is the AES-GCM ciphertext produced by lib/crypto.ts —
// callers must encrypt before calling this, never pass a raw data URL.
export async function updateOwnProfilePhoto(uid: string, encryptedPhoto: string | null) {
  await updateDoc(doc(db, 'users', uid), { encryptedPhoto })
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
