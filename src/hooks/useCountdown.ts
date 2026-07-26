import type { Timestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'

export function useCountdown(endsAt: Timestamp | null) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!endsAt) {
      setRemaining(null)
      return
    }
    const endMs = endsAt.toMillis()
    const tick = () => setRemaining(Math.max(0, Math.ceil((endMs - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [endsAt])

  return remaining
}
