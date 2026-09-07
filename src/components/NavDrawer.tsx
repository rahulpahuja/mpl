import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { signOut } from '../lib/auth'
import { isSoundEnabled, setSoundEnabled } from '../lib/sound'
import { DRAWER_GROUPS, NAV_DESTINATIONS } from '../lib/navShortcuts'

// Top-left slide-in menu. Its links come from lib/navShortcuts.ts
// (section 'drawer', grouped under DRAWER_GROUPS headings); the Account group
// also carries the sound toggle and sign-out actions. The overlay is portalled
// to <body> because Layout's header has a backdrop-filter, which would
// otherwise become the containing block for the fixed-positioned panel and
// clip it to the header's height.

function rowClass(active: boolean): string {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? 'bg-gradient-to-r from-blue-700 to-orange-500 text-white'
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
  }`
}

function Icon({ name, active }: { name: string; active?: boolean }) {
  return (
    <span
      className={`material-symbols-outlined text-[20px] ${
        active ? 'text-white' : 'text-gray-500 dark:text-gray-400'
      }`}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

export function NavDrawer() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  const links = NAV_DESTINATIONS.filter(
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

  if (!user || links.length === 0) return null

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="rounded-md border border-gray-300 px-2.5 py-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <span className="material-symbols-outlined block text-[20px]" aria-hidden="true">
          menu
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <nav className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-gray-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex shrink-0 items-center justify-between px-2 pb-2 pt-1">
                <span className="flex items-center gap-2 text-base font-bold tracking-tight">
                  <span
                    className="material-symbols-outlined bg-gradient-to-r from-blue-700 to-orange-500 bg-clip-text text-[22px] text-transparent"
                    aria-hidden="true"
                  >
                    sports_cricket
                  </span>
                  <span className="bg-gradient-to-r from-blue-700 to-orange-500 bg-clip-text text-transparent">
                    Auction Manager
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className="material-symbols-outlined rounded-md p-1 text-[20px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  close
                </button>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4 py-2">
                {DRAWER_GROUPS.map((group) => {
                  const groupLinks = links.filter((d) => d.group === group)
                  const isAccount = group === 'Account'
                  if (groupLinks.length === 0 && !isAccount) return null
                  return (
                    <div key={group} className="flex flex-col gap-0.5">
                      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {group}
                      </p>
                      {groupLinks.map((d) => (
                        <NavLink
                          key={d.to}
                          to={d.to}
                          end={d.end}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) => rowClass(isActive)}
                        >
                          {({ isActive }) => (
                            <>
                              {d.icon && <Icon name={d.icon} active={isActive} />}
                              {d.label}
                            </>
                          )}
                        </NavLink>
                      ))}
                      {isAccount && (
                        <>
                          <button type="button" onClick={toggleSound} className={rowClass(false)}>
                            <Icon name={soundOn ? 'volume_up' : 'volume_off'} />
                            {soundOn ? 'Sound on' : 'Sound off'}
                          </button>
                          <button
                            type="button"
                            onClick={() => signOut()}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                              logout
                            </span>
                            Sign out
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </>
  )
}
