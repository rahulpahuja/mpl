import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'

export function useAdminClaimed() {
  const [claimed, setClaimed] = useState<boolean | null>(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'meta', 'adminClaimed'),
      (snap) => {
        setClaimed(snap.exists() && snap.data().claimed === true)
      },
      (err) => {
        console.error('useAdminClaimed listener error', err)
        setClaimed(false)
      }
    )
    return unsubscribe
  }, [])

  return claimed
}
