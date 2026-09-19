import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { DraftMatch } from '../types'

// The Team Draft (if any) started from this match's setup page to divide its
// player pool — see createDraftMatch's linkedMatchId.
export function useLinkedDraft(matchId: string | undefined) {
  const [draft, setDraft] = useState<DraftMatch | null>(null)

  useEffect(() => {
    if (!matchId) return
    const q = query(collection(db, 'draftMatches'), where('linkedMatchId', '==', matchId))
    return onSnapshot(
      q,
      (snap) => setDraft((snap.docs[0]?.data() as DraftMatch | undefined) ?? null),
      (err) => console.error('useLinkedDraft listener error', err),
    )
  }, [matchId])

  return draft
}
