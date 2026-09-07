import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { NAV_DESTINATIONS } from '../lib/navShortcuts'

// Top-left slide-in menu for the less-frequently-used destinations (Settings,
// Users, Venues — see lib/navShortcuts.ts, section 'drawer'). Rendered once in
// Layout so it's available on every page; hides itself entirely when the
// signed-in role can't reach any of its links.
export function NavDrawer() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)

  const destinations = NAV_DESTINATIONS.filter(
    (d) => d.section === 'drawer' && user && (!d.roles || d.roles.includes(user.role)),
  )

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (destinations.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="rounded-md border border-gray-300 dark:border-gray-700 px-2.5 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col gap-1 border-r border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-950/90 p-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>
            {destinations.map((d) => (
              <NavLink
                key={d.to}
                to={d.to}
                end={d.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-700 to-orange-500 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                {d.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
