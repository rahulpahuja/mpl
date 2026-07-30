import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { Auction } from '../types'

// Auction `get` is public in the security rules, so this works for any signed-in
// role (Auction Manager, Team Manager, Player) without needing `list` access —
// useful on Home, where users only need to see the specific auctions they're
// assigned to, not browse the whole collection.
export function useAuctionsByIds(auctionIds: string[]) {
  const [auctions, setAuctions] = useState<Record<string, Auction>>({})

  useEffect(() => {
    const unsubscribes = auctionIds.map((auctionId) =>
      onSnapshot(
        doc(db, 'auctions', auctionId),
        (snap) => {
          if (!snap.exists()) return
          setAuctions((prev) => ({ ...prev, [auctionId]: snap.data() as Auction }))
        },
        (err) => {
          console.error('useAuctionsByIds listener error', err)
        },
      ),
    )
    return () => unsubscribes.forEach((unsub) => unsub())
  }, [auctionIds.join(',')])

  return auctions
}
