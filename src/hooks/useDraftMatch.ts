import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { DraftMatch } from '../types'

export function useDraftMatch(matchId: string | undefined) {
  const [match, setMatch] = useState<DraftMatch | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!matchId) {
      setMatch(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = onSnapshot(
      doc(db, 'draftMatches', matchId),
      (snap) => {
        setMatch(snap.exists() ? (snap.data() as DraftMatch) : null)
        setLoading(false)
      },
      (err) => {
        console.error('useDraftMatch listener error', err)
        setMatch(null)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [matchId])

  return { match, loading }
}
