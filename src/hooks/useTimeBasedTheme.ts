import { useEffect } from 'react'
import { applyTimeBasedTheme } from '../lib/timeBasedTheme'

// main.tsx applies the theme once before the initial render; this keeps it
// current for however long the tab stays open, so crossing 6pm/6am flips the
// theme live instead of requiring a reload.
export function useTimeBasedTheme() {
  useEffect(() => {
    const id = setInterval(applyTimeBasedTheme, 60_000)
    return () => clearInterval(id)
  }, [])
}
