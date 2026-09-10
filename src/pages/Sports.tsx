import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { usePageTitle } from '../hooks/usePageTitle'
import { Layout } from '../components/Layout'
import { SPORTS } from '../lib/sports'

function MetricPill({ dot, label, value }: { dot: string; label: string; value: string }) {
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

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'mint'
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="aa-label">{label}</p>
      <p className={`aa-numeric mt-0.5 text-lg ${accent === 'mint' ? 'aa-mint-text' : ''}`}>{value}</p>
    </div>
  )
}

export function Sports() {
  usePageTitle('Choose a sport')
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const { auctions } = useAuctionsList()

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const liveCount = auctions.filter((a) => a.status === 'live').length
  const comingSoon = SPORTS.filter((s) => !s.to).length

  return (
    <Layout>
      <div className="apex-arena">
        <div className="flex flex-col gap-6 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="aa-label aa-orange-text flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ea580c]" />
              Multi-sport roster management
            </p>
            <h1 className="aa-head mt-2 text-3xl sm:text-4xl">Choose a Sport</h1>
            <p className="mt-2 max-w-2xl text-sm aa-dim">
              Pick a discipline to run live auctions, configure budgets, and manage rosters. Cricket
              is live today — more are on the way.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <MetricPill dot="#10b981" label="Active sport" value="Cricket" />
            <MetricPill dot="#3b82f6" label="In pipeline" value={`${comingSoon} sports`} />
            {liveCount > 0 && (
              <MetricPill
                dot="#ef4444"
                label="Live now"
                value={`${liveCount} auction${liveCount === 1 ? '' : 's'}`}
              />
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SPORTS.map((sport) => {
            if (sport.to) {
              return (
                <Link
                  key={sport.id}
                  to={sport.to}
                  className="aa-hero-card group col-span-1 flex flex-col justify-between rounded-2xl p-6 sm:col-span-2"
                >
                  <div>
                    <span className="aa-chip aa-chip-mint">
                      {liveCount > 0
                        ? `${liveCount} live auction${liveCount === 1 ? '' : 's'}`
                        : 'Ready for auction'}
                    </span>
                    <div className="mt-4 flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#ea580c66] bg-[#ea580c22] text-3xl transition-transform group-hover:scale-105">
                        {sport.icon}
                      </div>
                      <div>
                        <h2 className="aa-head text-2xl">{sport.name}</h2>
                        <p className="mt-1 max-w-md text-xs aa-dim">
                          The full auction suite — live hammer bidding, purse tracking, teams,
                          players, matches and results.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border p-3">
                      <HeroStat label="Total auctions" value={auctions.length} />
                      <HeroStat label="Live now" value={liveCount} accent="mint" />
                    </div>
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <span className="aa-btn aa-btn-primary w-full">
                      Enter Cricket Hub
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        arrow_forward
                      </span>
                    </span>
                  </div>
                </Link>
              )
            }
            return (
              <div
                key={sport.id}
                aria-disabled="true"
                className="aa-card flex flex-col justify-between rounded-2xl p-5 opacity-70 grayscale"
              >
                <div>
                  <span className="aa-chip aa-chip-muted">Coming soon</span>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white/5 text-2xl">
                      {sport.icon}
                    </div>
                    <h3 className="aa-head text-lg">{sport.name}</h3>
                  </div>
                </div>
                <p className="mt-4 border-t pt-3 text-xs aa-muted">Not available yet</p>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
