import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, type ReactNode } from 'react'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import type { AppUser } from '../types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const setInitializing = useAuthStore((s) => s.setInitializing)

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeUserDoc?.()
      unsubscribeUserDoc = null

      if (!firebaseUser) {
        setUser(null)
        setInitializing(false)
        return
      }

      unsubscribeUserDoc = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (snap) => {
          setUser(snap.exists() ? (snap.data() as AppUser) : null)
          setInitializing(false)
        },
        (err) => {
          console.error('AuthProvider user doc listener error', err)
          setUser(null)
          setInitializing(false)
        }
      )
    })

    return () => {
      unsubscribeUserDoc?.()
      unsubscribeAuth()
    }
  }, [setUser, setInitializing])

  return children
}
