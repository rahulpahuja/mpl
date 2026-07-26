import { doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { UserRole } from '../types'

export async function updateUserRole(uid: string, role: UserRole) {
  await updateDoc(doc(db, 'users', uid), { role })
}

export interface ProfileFields {
  phone: string
  whatsapp: string
  location: string
}

export async function updateOwnProfile(uid: string, profile: ProfileFields) {
  await updateDoc(doc(db, 'users', uid), { ...profile })
}

export async function assignUserToAuction(uid: string, auctionId: string, currentAssignments: string[]) {
  if (currentAssignments.includes(auctionId)) return
  await updateDoc(doc(db, 'users', uid), {
    assignedAuctions: [...currentAssignments, auctionId],
  })
}
