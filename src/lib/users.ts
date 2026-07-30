import { arrayUnion, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { UserRole } from '../types'

export async function updateUserRole(uid: string, role: UserRole) {
  await updateDoc(doc(db, 'users', uid), { role })
}

// Narrower than updateUserRole: Admins, Auction Managers, and Team Managers can
// all promote a viewer to Player (e.g. spotting them in the crowd) without the
// broader role-management access an Admin has.
export async function promoteViewerToPlayer(uid: string) {
  await updateDoc(doc(db, 'users', uid), { role: 'player' })
}

export interface ProfileFields {
  phone: string
  whatsapp: string
  location: string
}

export async function updateOwnProfile(uid: string, profile: ProfileFields) {
  await updateDoc(doc(db, 'users', uid), { ...profile })
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
