import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLocationFilterStore } from '../store/locationFilterStore'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { usePageTitle } from '../hooks/usePageTitle'
import { Layout } from '../components/Layout'
import { auctionMatchesLocation, summarizeLocation } from '../lib/sportLocationFilter'
import { ANY } from '../lib/venueLocations'
import type { UserRole } from '../types'

interface QuickLink {
  to: string
  label: string
  icon: string
  desc: string
  roles?: UserRole[]
}

const QUICK_LINKS: QuickLink[] = [
  { to: '/home', label: 'My dashboard', icon: 'dashboard', desc: 'Your auctions and what needs you now' },
  {
    to: '/admin',
    label: 'Auctions directory',
    icon: 'gavel',
    desc: 'Create, configure and run auctions',
    roles: ['admin'],
  },
  {
    to: '/admin/teams',
    label: 'Teams',
    icon: 'groups',
    desc: 'Franchises, rosters and logos',
    roles: ['admin', 'auctionManager'],
  },
  {
    to: '/admin/players',
    label: 'Players',
    icon: 'person',
    desc: 'The registered player pool',
    roles: ['admin', 'auctionManager'],
  },
  {
    to: '/admin/matches',
    label: 'Matches',
    icon: 'sports_cricket',
    desc: 'Schedule and score live matches',
    roles: ['admin', 'auctionManager'],
  },
  { to: '/join', label: 'Join an auction', icon: 'login', desc: 'Enter a code to watch or bid' },
  { to: '/docs', label: 'Help & docs', icon: 'help', desc: 'How the auction and match flow works' },
]

function Pill({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="aa-card flex items-center gap-2.5 px-3.5 py-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
      <div>
        <p className="aa-label">{label}</p>
        <p className="aa-head text-sm">{value}</p>
      </div>
    </div>
  )
}

export function Sports() {
  usePageTitle('Cricket Hub')
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const location = useLocationFilterStore((s) => s.location)
  const clearLocation = useLocationFilterStore((s) => s.clearLocation)
  const { auctions } = useAuctionsList()

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const locationActive = location.country !== ANY
  const scoped = auctions.filter((a) => auctionMatchesLocation(a, location))
  const liveAuctions = scoped.filter((a) => a.status === 'live')
  const completedCount = scoped.filter((a) => a.status === 'completed').length
  const links = QUICK_LINKS.filter((l) => !l.roles || l.roles.includes(user.role))

  return (
    <Layout>
      <div className="apex-arena space-y-6">
        <div className="aa-hero-card rounded-2xl p-6">
          <span className="aa-label aa-orange-text flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ea580c]" />
            Cricket auction platform
          </span>
          <h1 className="aa-head mt-2 text-3xl sm:text-4xl">Welcome back, {user.displayName}</h1>
          <p className="mt-2 max-w-2xl text-sm aa-dim">
            Run live hammer auctions, build squads and play matches. Switch sport or location any
            time from the top bar.
          </p>
          {locationActive && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs aa-muted">
              <span className="material-symbols-outlined text-[16px] aa-orange-text" aria-hidden="true">
                location_on
              </span>
              Scoped to <span className="aa-dim">{summarizeLocation(location)}</span>
              <button
                type="button"
                onClick={clearLocation}
                className="font-medium aa-orange-text hover:underline"
              >
                Clear
              </button>
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill
              dot="#ef4444"
              label="Live now"
              value={`${liveAuctions.length} auction${liveAuctions.length === 1 ? '' : 's'}`}
            />
            <Pill
              dot="#3b82f6"
              label={locationActive ? 'Auctions here' : 'Total auctions'}
              value={String(scoped.length)}
            />
            <Pill dot="#10b981" label="Completed" value={String(completedCount)} />
          </div>
        </div>

        <section className="aa-card p-5">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="aa-head flex items-center gap-2 text-[15px]">
              <span className="material-symbols-outlined aa-orange-text text-[20px]" aria-hidden="true">
                bolt
              </span>
              Live right now
            </span>
            <span className="text-xs aa-muted">{liveAuctions.length} open</span>
          </div>
          {liveAuctions.length === 0 ? (
            <p className="mt-4 text-sm aa-muted">
              {locationActive
                ? `No live auctions in ${summarizeLocation(location)} right now.`
                : 'No auctions are live at the moment.'}
            </p>
          ) : (
            <ul className="mt-2 divide-y">
              {liveAuctions.map((a) => (
                <li key={a.auctionId}>
                  <Link
                    to={`/viewer/${a.auctionId}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.name}</span>
                      <span className="aa-numeric text-xs aa-muted">
                        {a.players.length} players · {a.teamManagers.length} teams
                        {a.location ? ` · ${a.location}` : ''}
                      </span>
                    </span>
                    <span className="aa-chip aa-chip-orange shrink-0">Watch</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="aa-card flex items-start gap-3 p-4 transition-colors hover:border-[#ea580c99]!"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#ea580c66] bg-[#ea580c22] text-[#ea580c]">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  {l.icon}
                </span>
              </span>
              <span className="min-w-0">
                <span className="aa-head block text-sm">{l.label}</span>
                <span className="mt-0.5 block text-xs aa-dim">{l.desc}</span>
              </span>
            </Link>
          ))}
        </section>
      </div>
    </Layout>
  )
}
