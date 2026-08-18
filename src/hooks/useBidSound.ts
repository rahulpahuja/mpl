import { useEffect, useRef } from 'react'
import type { PlayerBids } from '../types'
import { playBidBlip } from '../lib/sound'

// Plays a soft blip whenever a new bid lands on the player currently being
// watched. Switching to a different player's bid feed (or the feed loading
// its existing history for the first time) resets silently instead of
// blipping once per past bid.
export function useBidSound(bids: PlayerBids | null | undefined) {
  const prevKeyRef = useRef<string | null>(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    const key = bids?.playerId ?? null
    const count = bids?.bids.length ?? 0

    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key
      prevCountRef.current = count
      return
    }

    if (count > prevCountRef.current) {
      playBidBlip()
    }
    prevCountRef.current = count
  }, [bids])
}
