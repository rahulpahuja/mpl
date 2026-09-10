import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { signOut } from '../lib/auth'
import { isSoundEnabled, setSoundEnabled } from '../lib/sound'
import { DRAWER_GROUPS, NAV_DESTINATIONS } from '../lib/navShortcuts'
import { Avatar } from './Avatar'

const ACCOUNT_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  auctionManager: 'Auction Manager',
  manager: 'Captain',
  player: 'Player',
  viewer: 'Viewer',
}

// Top-left slide-in menu, styled in the Apex Arena dark language. Its links
// come from lib/navShortcuts.ts (section 'drawer'); Profile, Help and Sign
// out live in the footer, and the Account group carries the sound toggle.
// The overlay is portalled to <body> because Layout's header has a
// backdrop-filter, which would otherwise clip the fixed-positioned panel.

function navRowClass(active: boolean): string {
  return `flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
    active ? 'aa-nav-active' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
  }`
}

export function NavDrawer() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  const links = NAV_DESTINATIONS.filter(
    (d) => d.section === 'drawer' && user && (!d.roles || d.roles.includes(user.role)),
  )
  const helpLink = links.find((d) => d.to === '/docs')

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
            className="apex-arena fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="aa-drawer absolute inset-y-0 left-0 flex w-80 max-w-[90vw] flex-col border-r border-white/10 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#c2410c] via-[#ea580c] to-amber-400 text-white shadow-[0_0_24px_-4px_rgba(234,88,12,0.35)]">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      sports_cricket
                    </span>
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="aa-head text-base">
                      Auction<span className="text-[#f97316]">Manager</span>
                    </span>
                    <span className="aa-label text-[10px]">Pro Operator</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className="material-symbols-outlined flex h-8 w-8 items-center justify-center rounded-lg text-[18px] text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  close
                </button>
              </div>

              <nav className="aa-scroll flex-1 space-y-6 overflow-y-auto px-3 py-4">
                {DRAWER_GROUPS.map((group, groupIndex) => {
                  const groupLinks =
                    group === 'Main'
                      ? links.filter((d) => d.group === 'Main')
                      : []
                  const isAccount = group === 'Account'
                  if (groupLinks.length === 0 && !isAccount) return null
                  return (
                    <div key={group} className="space-y-1">
                      <div className="flex items-center justify-between px-3 pb-1.5">
                        <span className="aa-label">{group === 'Main' ? 'Main Console' : 'System'}</span>
                        <span className="aa-numeric text-[10px] text-slate-600">
                          {String(groupIndex + 1).padStart(2, '0')}
                        </span>
                      </div>
                      {groupLinks.map((d) => (
                        <NavLink
                          key={d.to}
                          to={d.to}
                          end={d.end}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) => navRowClass(isActive)}
                        >
                          {({ isActive }) => (
                            <>
                              <span className="flex items-center gap-3">
                                {d.icon && (
                                  <span
                                    className="material-symbols-outlined text-[20px]"
                                    aria-hidden="true"
                                  >
                                    {d.icon}
                                  </span>
                                )}
                                {d.label}
                              </span>
                              {isActive && (
                                <span className="aa-numeric rounded-md border border-[#ea580c4d] bg-[#ea580c33] px-1.5 py-0.5 text-[10px] text-[#fdba74]">
                                  Active
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      ))}
                      {isAccount && (
                        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2">
                          <span className="flex items-center gap-2.5 text-xs font-medium text-slate-300">
                            <span
                              className="material-symbols-outlined text-[18px] text-[#fb923c]"
                              aria-hidden="true"
                            >
                              {soundOn ? 'volume_up' : 'volume_off'}
                            </span>
                            Auction sound
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={soundOn}
                            aria-label="Toggle auction sound"
                            onClick={toggleSound}
                            className={`relative h-5 w-9 rounded-full transition-colors ${
                              soundOn ? 'bg-[#ea580c]' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                                soundOn ? 'translate-x-[18px]' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </nav>

              <div className="border-t border-white/10 bg-black/40 p-3">
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition-colors hover:border-[#ea580c66]"
                >
                  <Avatar
                    name={user.displayName}
                    filenPhotoId={user.filenPhotoId}
                    encryptedPhoto={user.encryptedPhoto}
                    photoURL={user.photoURL}
                    avatarId={user.avatarId}
                    shape="square"
                    size={10}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-white">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {ACCOUNT_ROLE_LABELS[user.role]} · {user.email}
                    </span>
                  </span>
                  <span
                    className="material-symbols-outlined shrink-0 text-[18px] text-slate-400"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </Link>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {helpLink && (
                    <NavLink
                      to={helpLink.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-lg py-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        {helpLink.icon ?? 'help'}
                      </span>
                      {helpLink.label}
                    </NavLink>
                  )}
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex items-center justify-center gap-2 rounded-lg border border-transparent py-2 font-medium text-rose-400 transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      logout
                    </span>
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
