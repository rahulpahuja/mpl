import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { Tournament } from '../types'

export function useTournamentsList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setTournaments(snap.docs.map((d) => d.data() as Tournament))
        setLoading(false)
      },
      (err) => {
        console.error('useTournamentsList listener error', err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  return { tournaments, loading }
}
