import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { PlayerStats } from '../types'

export function usePlayerStats(playerId: string | undefined) {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) {
      setStats(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = onSnapshot(
      doc(db, 'playerStats', playerId),
      (snap) => {
        setStats(snap.exists() ? (snap.data() as PlayerStats) : null)
        setLoading(false)
      },
      (err) => {
        console.error('usePlayerStats listener error', err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [playerId])

  return { stats, loading }
}
