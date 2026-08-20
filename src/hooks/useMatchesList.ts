import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { Match } from '../types'

export function useMatchesList() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setMatches(snap.docs.map((d) => d.data() as Match))
        setLoading(false)
      },
      (err) => {
        console.error('useMatchesList listener error', err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  return { matches, loading }
}
