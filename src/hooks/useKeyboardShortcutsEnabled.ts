import { useEffect, useState } from 'react'

// Device-local UI preference (not account data), so localStorage rather than
// a Firestore field — nothing to sync across devices.
const STORAGE_KEY = 'mpl:keyboardShortcutsEnabled'

function readStored(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'false'
}

export function useKeyboardShortcutsEnabled() {
  const [enabled, setEnabled] = useState(readStored)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled))
  }, [enabled])

  return [enabled, setEnabled] as const
}
