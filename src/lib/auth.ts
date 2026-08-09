import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { deleteDoc, doc, getDoc, runTransaction, serverTimestamp, type Transaction } from 'firebase/firestore'
import { auth, db, googleProvider, usingEmulators } from './firebase'
import { normalizeEmail } from './invites'
import { generateUserCode } from './userCode'
import type { AppUser, UserRole } from '../types'

const MAX_USER_CODE_ATTEMPTS = 5

// Finds a free code and reserves it via `reserve`, inside the transaction's
// read-then-write phase. All reads must happen before any write in a
// Firestore transaction, so this only ever does tx.get() — the caller's
// `reserve` (a tx.set()/tx.update() call) runs once, after a free code is found.
async function reserveUserCode(
  tx: Transaction,
  uid: string,
  reserve: (code: string, codeRef: ReturnType<typeof doc>) => void,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_USER_CODE_ATTEMPTS; attempt++) {
    const code = generateUserCode()
    const codeRef = doc(db, 'userCodes', code)
    const codeSnap = await tx.get(codeRef)
    if (!codeSnap.exists()) {
      tx.set(codeRef, { uid })
      reserve(code, codeRef)
      return code
    }
  }
  throw new Error('Could not generate a unique user ID. Please try again.')
}

// Reserves a userCodes/{code} doc and writes the new user doc in the same
// transaction, so two codes can never collide even under concurrent sign-ins.
async function createUserDocWithCode(userRef: ReturnType<typeof doc>, newUser: AppUser): Promise<string> {
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(userRef)
    if (existing.exists()) {
      return (existing.data() as AppUser).userCode ?? ''
    }

    return reserveUserCode(tx, newUser.uid, (code) => {
      tx.set(userRef, { ...newUser, userCode: code, createdAt: serverTimestamp() })
    })
  })
}

// Self-heals accounts created before the userCode feature shipped: called
// from the Profile page when a signed-in user's doc is missing a userCode.
export async function ensureUserCode(uid: string): Promise<string> {
  const userRef = doc(db, 'users', uid)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists()) {
      throw new Error('User not found')
    }
    const existing = (snap.data() as AppUser).userCode
    if (existing) {
      return existing
    }

    return reserveUserCode(tx, uid, (code) => {
      tx.update(userRef, { userCode: code })
    })
  })
}

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
  const userCode = await createUserDocWithCode(userRef, newUser)

  if (inviteSnap.exists()) {
    await deleteDoc(inviteRef)
  }

  return { ...newUser, userCode }
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
