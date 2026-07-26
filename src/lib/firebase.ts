import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// TEMPORARY debug hook, remove after diagnosing the live permission-denied issue
;(window as unknown as { __debugTest: (paths: string[]) => Promise<string> }).__debugTest = async (
  paths: string[],
) => {
  const results: Record<string, string> = {}
  for (const path of paths) {
    try {
      const snap = await getDocs(collection(db, path))
      results[path] = `ok (${snap.size} docs)`
    } catch (e) {
      results[path] = `ERROR: ${e instanceof Error ? e.message : String(e)}`
    }
  }
  return JSON.stringify(results, null, 2)
}
;(window as unknown as { __debugAuth: unknown }).__debugAuth = auth
