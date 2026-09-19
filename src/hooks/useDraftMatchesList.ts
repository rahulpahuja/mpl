import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { DraftMatch } from '../types'

export function useDraftMatchesList() {
  const [matches, setMatches] = useState<DraftMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'draftMatches'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setMatches(snap.docs.map((d) => d.data() as DraftMatch))
        setLoading(false)
      },
      (err) => {
        console.error('useDraftMatchesList listener error', err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  return { matches, loading }
}
