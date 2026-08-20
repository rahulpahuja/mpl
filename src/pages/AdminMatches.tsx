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

function matchLink(match: Match): { to: string; label: string } {
  switch (match.status) {
    case 'setup':
    case 'toss':
      return { to: `/admin/matches/${match.matchId}/setup`, label: 'Continue setup' }
    case 'live':
    case 'inningsBreak':
      return { to: `/score/${match.matchId}`, label: 'Score live' }
    default:
      return { to: `/matches/${match.matchId}`, label: 'View scorecard' }
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

  const inputClass =
    'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100'

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Matches</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Host a team-vs-team match — pick two teams, set the format, then run the live scorer.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:grid-cols-2">
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
                className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
              >
                {creating ? 'Creating...' : 'Create match'}
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">All matches</h2>
          {loading && <p className="mt-2 text-sm text-gray-500">Loading...</p>}
          <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            {matches.map((m) => {
              const link = matchLink(m)
              return (
                <li key={m.matchId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                    <span className="flex items-center gap-1.5">
                      <TeamAvatar teamName={m.teamA.teamName} logoId={m.teamA.logoId} logoImage={m.teamA.logoImage} jerseyColor={m.teamA.jerseyColor} />
                      <TeamAvatar teamName={m.teamB.teamName} logoId={m.teamB.logoId} logoImage={m.teamB.logoImage} jerseyColor={m.teamB.jerseyColor} />
                    </span>
                    <span className="min-w-0 truncate">{m.name}</span>
                    <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                      {STATUS_LABELS[m.status]}
                    </span>
                  </div>
                  <Link to={link.to} className="shrink-0 text-red-600 dark:text-red-400 hover:underline">
                    {link.label}
                  </Link>
                </li>
              )
            })}
            {!loading && matches.length === 0 && <li className="py-2 text-gray-500">No matches yet.</li>}
          </ul>
        </section>
      </div>
    </Layout>
  )
}
