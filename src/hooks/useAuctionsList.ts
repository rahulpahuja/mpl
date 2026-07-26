import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { Auction } from '../types'

export function useAuctionsList() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'auctions'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snap) => {
      setAuctions(snap.docs.map((d) => d.data() as Auction))
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { auctions, loading }
}
