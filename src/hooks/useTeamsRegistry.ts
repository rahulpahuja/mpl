import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { Team } from '../types'

export function useTeamsRegistry() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snap) => {
      setTeams(snap.docs.map((d) => d.data() as Team))
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { teams, loading }
}
