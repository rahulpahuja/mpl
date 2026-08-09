import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { NAV_DESTINATIONS } from '../lib/navShortcuts'
import { useAuthStore } from '../store/authStore'

// How long the second key of a "g <letter>" chord has to land after the "g".
const CHORD_TIMEOUT_MS = 800

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

// Wires up "g <letter>" navigation (see lib/navShortcuts.ts) and "?" to open
// the shortcuts help. Mounted once in Layout so it's live on every page.
export function useGlobalKeyboardShortcuts(enabled: boolean, onToggleHelp: () => void) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const pendingGRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '?') {
        e.preventDefault()
        onToggleHelp()
        return
      }

      if (Date.now() < pendingGRef.current) {
        pendingGRef.current = 0
        const chord = `g ${e.key.toLowerCase()}`
        const destination = NAV_DESTINATIONS.find(
          (d) => d.chord === chord && user && (!d.roles || d.roles.includes(user.role)),
        )
        if (destination) {
          e.preventDefault()
          navigate(destination.to)
        }
        return
      }

      if (e.key === 'g') {
        pendingGRef.current = Date.now() + CHORD_TIMEOUT_MS
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, navigate, user, onToggleHelp])
}
