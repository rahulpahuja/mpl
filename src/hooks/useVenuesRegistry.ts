import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { Venue } from '../types'

export function useVenuesRegistry() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'venues'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setVenues(snap.docs.map((d) => d.data() as Venue))
        setLoading(false)
      },
      (err) => {
        console.error('useVenuesRegistry listener error', err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  return { venues, loading }
}
