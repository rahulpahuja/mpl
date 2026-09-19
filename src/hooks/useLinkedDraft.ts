import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { DraftMatch } from '../types'

// The Team Draft that divided this match's players, if any: either one
// started from the web setup page (linkedMatchId), or the draft a match was
// started from on the Android app, which shares the match's ID.
export function useLinkedDraft(matchId: string | undefined) {
  const [sameId, setSameId] = useState<DraftMatch | null>(null)
  const [linked, setLinked] = useState<DraftMatch | null>(null)

  useEffect(() => {
    if (!matchId) return
    const onError = (err: Error) => console.error('useLinkedDraft listener error', err)
    const unsubSameId = onSnapshot(
      doc(db, 'draftMatches', matchId),
      (snap) => setSameId(snap.exists() ? (snap.data() as DraftMatch) : null),
      onError,
    )
    const unsubLinked = onSnapshot(
      query(collection(db, 'draftMatches'), where('linkedMatchId', '==', matchId)),
      (snap) => setLinked((snap.docs[0]?.data() as DraftMatch | undefined) ?? null),
      onError,
    )
    return () => {
      unsubSameId()
      unsubLinked()
    }
  }, [matchId])

  return sameId ?? linked
}
