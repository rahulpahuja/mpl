import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, usingEmulators } from './firebase'
import { normalizeEmail } from './invites'
import type { AppUser, UserRole } from '../types'

async function ensureUserDoc(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
): Promise<AppUser> {
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

export async function signInWithGoogle(): Promise<AppUser> {
  const result = await signInWithPopup(auth, googleProvider)
  const { uid, email, displayName, photoURL } = result.user
  return ensureUserDoc(uid, email, displayName, photoURL)
}

const TEST_PASSWORD = 'test-password-123'

/**
 * Email/password sign-in against the Firebase Auth emulator only — lets you
 * exercise the app as different roles without a real Google OAuth popup.
 * Throws if called against a real (non-emulator) Firebase project.
 */
export async function signInTestUser(email: string, displayName: string): Promise<AppUser> {
  if (!usingEmulators) {
    throw new Error('Test sign-in is only available when running against the Firebase emulator.')
  }
  const normalized = normalizeEmail(email)
  try {
    const result = await createUserWithEmailAndPassword(auth, normalized, TEST_PASSWORD)
    return ensureUserDoc(result.user.uid, normalized, displayName, null)
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'auth/email-already-in-use') {
      const result = await signInWithEmailAndPassword(auth, normalized, TEST_PASSWORD)
      return ensureUserDoc(result.user.uid, normalized, displayName, null)
    }
    throw err
  }
}

export async function signOut() {
  await firebaseSignOut(auth)
}
