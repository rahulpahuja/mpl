import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { TeamAvatar } from '../components/TeamAvatar'
import { useMatchesList } from '../hooks/useMatchesList'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { useTournamentsList } from '../hooks/useTournamentsList'
import { useVenuesRegistry } from '../hooks/useVenuesRegistry'
import { useAuthStore } from '../store/authStore'
import { createMatch } from '../lib/matches'
import type { BallType, DayNight, GroundType, Match, MatchFormat } from '../types'
import '../styles/apex-arena.css'

const BALL_TYPE_LABELS: Record<BallType, string> = { tennis: 'Tennis ball', leather: 'Leather ball' }
const GROUND_TYPE_LABELS: Record<GroundType, string> = { ground: 'Ground', box: 'Box cricket', gully: 'Gully' }

const STATUS_LABELS: Record<Match['status'], string> = {
  setup: 'Setting up',
  toss: 'Ready for toss',
  live: 'Live',
  inningsBreak: 'Innings break',
  completed: 'Completed',
  abandoned: 'Abandoned',
}

function MatchKpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: string
  accent?: 'orange' | 'mint' | 'live'
}) {
  const valueClass =
    accent === 'orange'
      ? 'aa-orange-text'
      : accent === 'mint'
        ? 'aa-mint-text'
        : accent === 'live'
          ? 'text-[#ef4444]'
          : ''
  return (
    <div className="aa-kpi flex items-center justify-between gap-3">
      <div>
        <p className="aa-label">{label}</p>
        <p className={`aa-numeric mt-1 text-xl ${valueClass}`}>{value}</p>
      </div>
      <span className="material-symbols-outlined aa-muted text-[22px]" aria-hidden="true">
        {icon}
      </span>
    </div>
  )
}

const STATUS_CHIP: Record<Match['status'], string> = {
  setup: 'aa-chip aa-chip-muted',
  toss: 'aa-chip aa-chip-muted',
  live: 'aa-chip aa-chip-orange',
  inningsBreak: 'aa-chip aa-chip-orange',
  completed: 'aa-chip aa-chip-mint',
  abandoned: 'aa-chip aa-chip-muted',
}

function oversFmt(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}

function inningsLine(m: Match): string | null {
  const parts: string[] = []
  for (const inn of [m.innings1, m.innings2]) {
    if (!inn) continue
    const side = inn.battingTeamId === m.teamA.teamId ? m.teamA.teamName : m.teamB.teamName
    parts.push(`${side} ${inn.totalRuns}/${inn.wickets} (${oversFmt(inn.legalBallsBowled)})`)
  }
  return parts.length ? parts.join('  ·  ') : null
}

function matchLink(match: Match): { to: string; label: string; icon: string } {
  switch (match.status) {
    case 'setup':
    case 'toss':
      return {
        to: `/admin/matches/${match.matchId}/setup`,
        label: 'Continue setup',
        icon: 'tune',
      }
    case 'live':
    case 'inningsBreak':
      return { to: `/score/${match.matchId}`, label: 'Score live', icon: 'sports_score' }
    default:
      return { to: `/matches/${match.matchId}`, label: 'View scorecard', icon: 'description' }
  }
}

export function AdminMatches() {
  usePageTitle('Matches')
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { matches, loading } = useMatchesList()
  const { teams } = useTeamsRegistry()
  const { tournaments } = useTournamentsList()
  const { venues } = useVenuesRegistry()

  const [name, setName] = useState('')
  const [teamAId, setTeamAId] = useState('')
  const [teamBId, setTeamBId] = useState('')
  const [format, setFormat] = useState<MatchFormat>('friendly')
  const [tournamentId, setTournamentId] = useState('')
  const [dayNight, setDayNight] = useState<DayNight>('day')
  const [ballType, setBallType] = useState<BallType>('tennis')
  const [groundType, setGroundType] = useState<GroundType>('ground')
  const [oversLimit, setOversLimit] = useState('20')
  const [venueId, setVenueId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overs = Number(oversLimit)
  const canCreate =
    !!teamAId && !!teamBId && teamAId !== teamBId && overs > 0 && (format === 'friendly' || !!tournamentId)

  async function handleCreate() {
    if (!user || !canCreate) return
    setError(null)
    setCreating(true)
    try {
      const teamA = teams.find((t) => t.teamId === teamAId)
      const teamB = teams.find((t) => t.teamId === teamBId)
      if (!teamA || !teamB) throw new Error('Pick both teams')
      const tournament = format === 'tournament' ? tournaments.find((t) => t.tournamentId === tournamentId) : null
      const venue = venueId ? venues.find((v) => v.venueId === venueId) : null

      const matchId = await createMatch({
        name: name.trim() || `${teamA.teamName} vs ${teamB.teamName}`,
        format,
        tournamentId: tournament?.tournamentId ?? null,
        tournamentName: tournament?.name ?? null,
        dayNight,
        ballType,
        groundType,
        oversLimit: overs,
        venueId: venue?.venueId ?? null,
        venueName: venue?.name ?? null,
        teamA: {
          teamId: teamA.teamId,
          teamName: teamA.teamName,
          logoId: teamA.logoId ?? null,
          logoImage: teamA.logoImage ?? null,
          jerseyColor: teamA.jerseyColor ?? null,
        },
        teamB: {
          teamId: teamB.teamId,
          teamName: teamB.teamName,
          logoId: teamB.logoId ?? null,
          logoImage: teamB.logoImage ?? null,
          jerseyColor: teamB.jerseyColor ?? null,
        },
        createdBy: user.uid,
      })
      navigate(`/admin/matches/${matchId}/setup`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match')
    } finally {
      setCreating(false)
    }
  }

  const inputClass = 'input-glass w-full rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100'

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <section className="apex-arena">
          <p className="aa-label aa-orange-text flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              sports_cricket
            </span>
            Tournament Operations
          </p>
          <h1 className="aa-head mt-1.5 text-2xl sm:text-3xl">Matches &amp; Fixtures</h1>
          <p className="mt-1.5 max-w-3xl text-sm aa-dim">
            Host a team-vs-team match — pick two teams, set the format, then run the live scorer.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MatchKpi
              label="Live now"
              value={matches.filter((m) => m.status === 'live' || m.status === 'inningsBreak').length}
              icon="sports_score"
              accent="live"
            />
            <MatchKpi
              label="Upcoming"
              value={matches.filter((m) => m.status === 'setup' || m.status === 'toss').length}
              icon="schedule"
              accent="orange"
            />
            <MatchKpi
              label="Completed"
              value={matches.filter((m) => m.status === 'completed').length}
              icon="check_circle"
              accent="mint"
            />
            <MatchKpi
              label="Venues"
              value={venues.filter((v) => !v.retired).length}
              icon="stadium"
            />
          </div>

          <div className="glass-card mt-4 grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Match name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto: Team A vs Team B"
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Team A</label>
              <select value={teamAId} onChange={(e) => setTeamAId(e.target.value)} className={`mt-1 ${inputClass}`}>
                <option value="">Select team...</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId} disabled={t.teamId === teamBId}>
                    {t.teamName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Team B</label>
              <select value={teamBId} onChange={(e) => setTeamBId(e.target.value)} className={`mt-1 ${inputClass}`}>
                <option value="">Select team...</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId} disabled={t.teamId === teamAId}>
                    {t.teamName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Format</label>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-200">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={format === 'friendly'} onChange={() => setFormat('friendly')} />
                  Friendly
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={format === 'tournament'} onChange={() => setFormat('tournament')} />
                  Tournament match
                </label>
              </div>
            </div>
            {format === 'tournament' && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Tournament</label>
                <select
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                >
                  <option value="">Select tournament...</option>
                  {tournaments.map((t) => (
                    <option key={t.tournamentId} value={t.tournamentId}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {tournaments.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    No tournaments yet —{' '}
                    <Link to="/admin/tournaments" className="text-red-600 dark:text-red-400 hover:underline">
                      create one first
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Day / Night</label>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-200">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={dayNight === 'day'} onChange={() => setDayNight('day')} />
                  Day
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={dayNight === 'night'} onChange={() => setDayNight('night')} />
                  Night
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Ball type</label>
              <select value={ballType} onChange={(e) => setBallType(e.target.value as BallType)} className={`mt-1 ${inputClass}`}>
                {(Object.keys(BALL_TYPE_LABELS) as BallType[]).map((v) => (
                  <option key={v} value={v}>
                    {BALL_TYPE_LABELS[v]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Ground type</label>
              <select value={groundType} onChange={(e) => setGroundType(e.target.value as GroundType)} className={`mt-1 ${inputClass}`}>
                {(Object.keys(GROUND_TYPE_LABELS) as GroundType[]).map((v) => (
                  <option key={v} value={v}>
                    {GROUND_TYPE_LABELS[v]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Overs per innings</label>
              <input
                type="number"
                min={1}
                value={oversLimit}
                onChange={(e) => setOversLimit(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Venue (optional)</label>
              <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className={`mt-1 ${inputClass}`}>
                <option value="">No venue</option>
                {venues.map((v) => (
                  <option key={v.venueId} value={v.venueId}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

            <div className="sm:col-span-2">
              <button
                onClick={handleCreate}
                disabled={!canCreate || creating}
                className="btn-brand w-full rounded-lg px-4 py-2.5 text-sm font-medium sm:w-auto"
              >
                {creating ? 'Creating...' : 'Create match'}
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="aa-head text-lg text-gray-900 dark:text-gray-100">All matches</h2>
          {loading && <p className="mt-2 text-sm text-gray-500">Loading...</p>}
          <ul className="mt-3 space-y-3">
            {matches.map((m) => {
              const link = matchLink(m)
              const scores = inningsLine(m)
              const isLive = m.status === 'live' || m.status === 'inningsBreak'
              return (
                <li
                  key={m.matchId}
                  className={`aa-card p-4 sm:p-5 ${isLive ? 'border-[#ea580c99]!' : ''}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={STATUS_CHIP[m.status]}>{STATUS_LABELS[m.status]}</span>
                    <span className="aa-chip aa-chip-muted capitalize">{m.format}</span>
                    <span className="aa-chip aa-chip-muted">{m.oversLimit} ov</span>
                    <span className="aa-chip aa-chip-muted">{BALL_TYPE_LABELS[m.ballType]}</span>
                    {m.venueName && (
                      <span className="flex items-center gap-1 aa-muted">
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                          location_on
                        </span>
                        {m.venueName}
                      </span>
                    )}
                    <span className="aa-numeric ml-auto aa-muted">ID: {m.matchId}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <TeamAvatar teamName={m.teamA.teamName} logoId={m.teamA.logoId} logoImage={m.teamA.logoImage} jerseyColor={m.teamA.jerseyColor} />
                      <span className="aa-head truncate text-[15px]">{m.teamA.teamName}</span>
                      <span className="aa-numeric shrink-0 rounded border px-1.5 py-0.5 text-[10px] aa-muted">
                        VS
                      </span>
                      <span className="aa-head truncate text-[15px]">{m.teamB.teamName}</span>
                      <TeamAvatar teamName={m.teamB.teamName} logoId={m.teamB.logoId} logoImage={m.teamB.logoImage} jerseyColor={m.teamB.jerseyColor} />
                    </div>
                    <Link to={link.to} className="aa-btn aa-btn-primary shrink-0">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {link.icon}
                      </span>
                      {link.label}
                    </Link>
                  </div>

                  {m.status === 'completed' && m.result && (
                    <p className="aa-chip aa-chip-mint mt-3">
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        emoji_events
                      </span>
                      {m.result}
                    </p>
                  )}
                  {scores && <p className="mt-2 text-xs aa-dim aa-numeric">{scores}</p>}
                </li>
              )
            })}
            {!loading && matches.length === 0 && <li className="py-2 aa-muted">No matches yet.</li>}
          </ul>
        </section>
      </div>
    </Layout>
  )
}
