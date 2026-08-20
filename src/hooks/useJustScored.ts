import { useEffect, useRef, useState } from 'react'
import type { ExtraType, Match } from '../types'

export interface JustScoredEvent {
  runs: number
  extraType: ExtraType | null
  isWicket: boolean
  isBoundary: 4 | 6 | null
}

// Watches Match.lastBall.ballSeq for a transition, the same way
// useJustSoldPlayer watches Auction.currentPlayerId — lastBall is
// denormalized onto the match doc by lib/matches.ts's recordBall purely so
// this hook (and anyone watching the match, not just the scorer) can react
// to the latest ball without listening to the balls subcollection. Only
// fires for a boundary or a wicket — dot balls and singles aren't a
// celebration moment.
export function useJustScored(match: Match | null | undefined) {
  const [event, setEvent] = useState<JustScoredEvent | null>(null)
  const prevSeqRef = useRef<number | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!match) return
    const prevSeq = prevSeqRef.current
    const currentSeq = match.lastBall?.ballSeq ?? null

    if (!initializedRef.current) {
      initializedRef.current = true
      prevSeqRef.current = currentSeq
      return
    }

    if (currentSeq !== null && currentSeq !== prevSeq && match.lastBall) {
      const { runs, extraType, isWicket, isBoundary } = match.lastBall
      if (isBoundary || isWicket) setEvent({ runs, extraType, isWicket, isBoundary })
    }
    prevSeqRef.current = currentSeq
  }, [match])

  return { event, clear: () => setEvent(null) }
}
