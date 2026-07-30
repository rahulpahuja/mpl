import { initializeApp } from 'firebase/app'
import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Only active when explicitly opted into via `npm run dev:emulator` — normal
// `npm run dev` still talks to the real Firebase project untouched.
export const usingEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'

export const app = initializeApp(firebaseConfig)

// Default (IndexedDB) persistence is shared by every tab on this origin, so
// signing in on one tab would silently sign in all of them. Session storage
// is per-tab — setting it at init time (not just on sign-in) matters because
// a fresh page load restores from whatever the persistence hierarchy finds
// first, and IndexedDB would otherwise win over a same-page setPersistence
// call made after the fact.
export const auth = usingEmulators
  ? initializeAuth(app, { persistence: browserSessionPersistence })
  : getAuth(app)

export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
