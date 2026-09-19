import { useEffect } from 'react'

// Swaps the pitch-striped page backdrop for a plain near-black one while the
// calling page is mounted (see :root.plain-backdrop in index.css).
export function usePlainBackdrop() {
  useEffect(() => {
    document.documentElement.classList.add('plain-backdrop')
    return () => document.documentElement.classList.remove('plain-backdrop')
  }, [])
}
