import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { signOut } from '../lib/auth'

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  auctionManager: 'Auction Manager',
  manager: 'Team Manager',
  player: 'Player',
  viewer: 'Viewer',
}

export function Layout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-950/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="bg-gradient-to-r from-blue-700 to-orange-500 bg-clip-text text-lg font-semibold tracking-tight text-transparent"
          >
            MPL Auction Manager
          </Link>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-full"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-gray-500 dark:text-gray-400" title={user.email}>
                {user.displayName} <span className="text-gray-400">· {roleLabel[user.role]}</span>
              </span>
              <Link
                to="/profile"
                className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Profile
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
