import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { PlayerBids } from '../types'

export function useBids(auctionId: string | undefined, playerId: string | null | undefined) {
  const [bids, setBids] = useState<PlayerBids | null>(null)

  useEffect(() => {
    if (!auctionId || !playerId) {
      setBids(null)
      return
    }
    const unsubscribe = onSnapshot(
      doc(db, 'auctions', auctionId, 'bids', playerId),
      (snap) => {
        setBids(snap.exists() ? (snap.data() as PlayerBids) : null)
      },
      (err) => {
        console.error('useBids listener error', err)
      },
    )
    return unsubscribe
  }, [auctionId, playerId])

  return bids
}
