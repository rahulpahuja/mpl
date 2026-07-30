import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import type { Invite } from '../types'

export function useInvites() {
  const [invites, setInvites] = useState<Invite[]>([])

  useEffect(() => {
    const q = query(collection(db, 'invites'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setInvites(snap.docs.map((d) => d.data() as Invite))
      },
      (err) => {
        console.error('useInvites listener error', err)
      },
    )
    return unsubscribe
  }, [])

  return invites
}
