import { collection, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { AuctionTeamStats } from '../types'

export function useTeams(auctionId: string | undefined) {
  const [teams, setTeams] = useState<AuctionTeamStats[]>([])

  useEffect(() => {
    if (!auctionId) {
      setTeams([])
      return
    }
    const unsubscribe = onSnapshot(collection(db, 'auctions', auctionId, 'teams'), (snap) => {
      setTeams(snap.docs.map((d) => d.data() as AuctionTeamStats))
    })
    return unsubscribe
  }, [auctionId])

  return teams
}
