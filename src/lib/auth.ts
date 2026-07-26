import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { normalizeEmail } from './invites'
import type { AppUser, UserRole } from '../types'

export async function signInWithGoogle(): Promise<AppUser> {
  const result = await signInWithPopup(auth, googleProvider)
  const { uid, email, displayName, photoURL } = result.user
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)

  if (snap.exists()) {
    return snap.data() as AppUser
  }

  let role: UserRole = 'viewer'
  const normalizedEmail = normalizeEmail(email ?? '')
  const inviteRef = doc(db, 'invites', normalizedEmail)
  const inviteSnap = await getDoc(inviteRef)
  if (inviteSnap.exists()) {
    role = inviteSnap.data().role as UserRole
  }

  const newUser: AppUser = {
    uid,
    email: email ?? '',
    displayName: displayName ?? email ?? 'Unknown',
    photoURL: photoURL ?? null,
    role,
    assignedAuctions: [],
    phone: '',
    whatsapp: '',
    location: '',
  }
  await setDoc(userRef, { ...newUser, createdAt: serverTimestamp() })

  if (inviteSnap.exists()) {
    await deleteDoc(inviteRef)
  }

  return newUser
}

export async function signOut() {
  await firebaseSignOut(auth)
}
