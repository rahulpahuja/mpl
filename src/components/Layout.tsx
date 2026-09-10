import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NavDrawer } from './NavDrawer'
import { SportSwitcher } from './SportSwitcher'
import { LocationButton } from './LocationButton'
import { PhotoApprovalPrompt } from './PhotoApprovalPrompt'
import { PhotoRequestOutcomeToast } from './PhotoRequestOutcomeToast'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'
import { useGlobalKeyboardShortcuts } from '../hooks/useGlobalKeyboardShortcuts'
import { useKeyboardShortcutsEnabled } from '../hooks/useKeyboardShortcutsEnabled'
import { unlockAudio } from '../lib/sound'
import { lazyWithRetry } from '../lib/lazyWithRetry'

// Lazy-loaded, not just because it's big (a full mini-game's worth of SVG
// and CSS) but because Layout wraps every page — without this, everyone's
// first paint would pay for a game most visits never open.
const SixOrOutGame = lazyWithRetry(() =>
  import('./SixOrOutGame').then((m) => ({ default: m.SixOrOutGame })),
)

export function Layout({ children }: { children: ReactNode }) {
  const [shortcutsEnabled] = useKeyboardShortcutsEnabled()
  const [helpOpen, setHelpOpen] = useState(false)
  const [gameOpen, setGameOpen] = useState(false)
  useGlobalKeyboardShortcuts(shortcutsEnabled, () => setHelpOpen((v) => !v))

  // Mobile browsers only allow audio playback after a real user gesture in
  // the tab. Unlocking on the very first tap/keypress anywhere means the
  // sold-celebration sound is already armed by the time anyone actually
  // triggers it, instead of silently failing on the first auction of a
  // session.
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-950/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <NavDrawer />
            <Link
              to="/"
              className="shrink-0 bg-gradient-to-r from-blue-700 to-orange-500 bg-clip-text text-base sm:text-lg font-semibold tracking-tight text-transparent"
            >
              Auction Manager
            </Link>
            <SportSwitcher />
            <LocationButton />
          </div>
          <button
            type="button"
            onClick={() => setGameOpen(true)}
            title="Play a quick cricket game while you wait"
            aria-label="Play a quick cricket game while you wait"
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-blue-700 to-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              sports_cricket
            </span>
            Play
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <PhotoApprovalPrompt />
      <PhotoRequestOutcomeToast />
      {gameOpen && (
        <Suspense fallback={null}>
          <SixOrOutGame onClose={() => setGameOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
