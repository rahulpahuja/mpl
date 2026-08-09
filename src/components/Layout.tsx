import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { signOut } from '../lib/auth'
import { Avatar } from './Avatar'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'
import { useGlobalKeyboardShortcuts } from '../hooks/useGlobalKeyboardShortcuts'
import { useKeyboardShortcutsEnabled } from '../hooks/useKeyboardShortcutsEnabled'

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  auctionManager: 'Auction Manager',
  manager: 'Team Manager',
  player: 'Player',
  viewer: 'Viewer',
}

export function Layout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const [shortcutsEnabled] = useKeyboardShortcutsEnabled()
  const [helpOpen, setHelpOpen] = useState(false)
  useGlobalKeyboardShortcuts(shortcutsEnabled, () => setHelpOpen((v) => !v))

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-950/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
          <Link
            to="/"
            className="bg-gradient-to-r from-blue-700 to-orange-500 bg-clip-text text-base sm:text-lg font-semibold tracking-tight text-transparent"
          >
            MPL Auction Manager
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
            {user && (
              <>
                <Link to="/profile" title="View your profile" aria-label="View your profile">
                  <Avatar
                    name={user.displayName}
                    encryptedPhoto={user.encryptedPhoto}
                    photoURL={user.photoURL}
                    avatarId={user.avatarId}
                    size={7}
                  />
                </Link>
                <span
                  className="hidden text-gray-500 dark:text-gray-400 sm:inline"
                  title={user.email}
                >
                  {user.displayName} <span className="text-gray-400">· {roleLabel[user.role]}</span>
                </span>
                <Link
                  to="/profile"
                  className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Profile
                </Link>
              </>
            )}
            <Link
              to="/docs"
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Help
            </Link>
            {user && (
              <button
                onClick={() => signOut()}
                className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
