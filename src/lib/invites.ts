import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { UserRole } from '../types'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function createInvite(email: string, role: UserRole) {
  const normalized = normalizeEmail(email)
  await setDoc(doc(db, 'invites', normalized), {
    email: normalized,
    role,
    createdAt: serverTimestamp(),
  })
}

export async function deleteInvite(email: string) {
  await deleteDoc(doc(db, 'invites', normalizeEmail(email)))
}
