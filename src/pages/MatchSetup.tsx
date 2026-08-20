import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { TeamAvatar } from '../components/TeamAvatar'
import { useMatch } from '../hooks/useMatch'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { recordToss, setPlayingXI } from '../lib/matches'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'
import type { Match, RosterPlayer, TossDecision } from '../types'

const REQUIRED_XI = 11

function SideXIEditor({
  match,
  side,
  roster,
}: {
  match: Match
  side: 'teamA' | 'teamB'
  roster: RosterPlayer[]
}) {
  const team = match[side]
  const [selected, setSelected] = useState<Set<string>>(new Set(team.playingXI))
  const [captainId, setCaptainId] = useState(team.captainId ?? '')
  const [wicketKeeperId, setWicketKeeperId] = useState(team.wicketKeeperId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locked = match.status !== 'setup' && match.status !== 'toss'
  const alreadySaved = team.playingXI.length === REQUIRED_XI

  function toggle(playerId: string) {
    if (locked) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
        if (captainId === playerId) setCaptainId('')
        if (wicketKeeperId === playerId) setWicketKeeperId('')
      } else if (next.size < REQUIRED_XI) {
        next.add(playerId)
      }
      return next
    })
  }

  async function handleSave() {
    if (selected.size !== REQUIRED_XI) return
    setError(null)
    setSaving(true)
    try {
      await setPlayingXI(match.matchId, team.teamId, [...selected], captainId || null, wicketKeeperId || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Playing XI')
    } finally {
      setSaving(false)
    }
  }

  const selectedPlayers = roster.filter((p) => selected.has(p.playerId))

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2">
        <TeamAvatar teamName={team.teamName} logoId={team.logoId} logoImage={team.logoImage} jerseyColor={team.jerseyColor} />
        <h2 className="min-w-0 truncate text-base font-medium text-gray-900 dark:text-gray-100">{team.teamName}</h2>
        {alreadySaved && (
          <span className="shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            XI set
          </span>
        )}
      </div>
      <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        {selected.size} / {REQUIRED_XI} selected
      </p>

      {roster.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          This team has no roster yet — add players from the{' '}
          <Link to="/admin/teams" className="text-red-600 dark:text-red-400 hover:underline">
            Teams page
          </Link>{' '}
          first.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {roster.map((p) => {
            const isSelected = selected.has(p.playerId)
            return (
              <li key={p.playerId}>
                <button
                  type="button"
                  disabled={locked || (!isSelected && selected.size >= REQUIRED_XI)}
                  onClick={() => toggle(p.playerId)}
                  className={`flex w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm disabled:opacity-50 ${
                    isSelected
                      ? 'border-red-600 bg-red-50 dark:bg-red-950/30'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <Avatar name={p.name} avatarId={p.avatarId} photoURL={p.photoURL} encryptedPhoto={p.encryptedPhoto} />
                  <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                    {p.name}
                    {p.playingRole && (
                      <span className="ml-1.5 text-xs text-gray-500">{PLAYING_ROLE_LABELS[p.playingRole]}</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected.size === REQUIRED_XI && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Captain</label>
            <select
              value={captainId}
              onChange={(e) => setCaptainId(e.target.value)}
              disabled={locked}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
            >
              <option value="">Select captain...</option>
              {selectedPlayers.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Wicketkeeper</label>
            <select
              value={wicketKeeperId}
              onChange={(e) => setWicketKeeperId(e.target.value)}
              disabled={locked}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
            >
              <option value="">Select wicketkeeper...</option>
              {selectedPlayers.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {!locked && (
        <button
          onClick={handleSave}
          disabled={saving || selected.size !== REQUIRED_XI}
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
        >
          {saving ? 'Saving...' : 'Save Playing XI'}
        </button>
      )}
    </section>
  )
}

function TossSection({ match }: { match: Match }) {
  const navigate = useNavigate()
  const [wonByTeamId, setWonByTeamId] = useState(match.teamA.teamId)
  const [decision, setDecision] = useState<TossDecision>('bat')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRecordToss() {
    setError(null)
    setSaving(true)
    try {
      await recordToss(match.matchId, wonByTeamId, decision)
      navigate(`/score/${match.matchId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record toss')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Toss</h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Won the toss</label>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-200">
            {[match.teamA, match.teamB].map((t) => (
              <label key={t.teamId} className="flex items-center gap-1.5">
                <input type="radio" checked={wonByTeamId === t.teamId} onChange={() => setWonByTeamId(t.teamId)} />
                {t.teamName}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Chose to</label>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-200">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={decision === 'bat'} onChange={() => setDecision('bat')} />
              Bat
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={decision === 'bowl'} onChange={() => setDecision('bowl')} />
              Bowl
            </label>
          </div>
        </div>
        <button
          onClick={handleRecordToss}
          disabled={saving}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? 'Starting...' : 'Record toss & start match'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  )
}

export function MatchSetup() {
  const { matchId } = useParams<{ matchId: string }>()
  const { match, loading } = useMatch(matchId)
  const { teams } = useTeamsRegistry()
  usePageTitle(match ? `Set up · ${match.name}` : 'Set up match')

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-500">Loading...</p>
      </Layout>
    )
  }
  if (!match) {
    return (
      <Layout>
        <p className="text-gray-500">No match found for ID "{matchId}".</p>
      </Layout>
    )
  }

  const teamARoster = teams.find((t) => t.teamId === match.teamA.teamId)?.roster ?? []
  const teamBRoster = teams.find((t) => t.teamId === match.teamB.teamId)?.roster ?? []

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{match.name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {match.dayNight === 'day' ? 'Day match' : 'Night match'} · {match.oversLimit} overs
            {match.tournamentName ? ` · ${match.tournamentName}` : ' · Friendly'}
          </p>
        </div>

        {(match.status === 'live' || match.status === 'inningsBreak' || match.status === 'completed') && (
          <p className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-sm text-gray-600 dark:text-gray-400">
            This match is already underway.{' '}
            <Link to={match.status === 'completed' ? `/matches/${match.matchId}` : `/score/${match.matchId}`} className="text-red-600 dark:text-red-400 hover:underline">
              {match.status === 'completed' ? 'View scorecard' : 'Go to live scorer'}
            </Link>
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SideXIEditor match={match} side="teamA" roster={teamARoster} />
          <SideXIEditor match={match} side="teamB" roster={teamBRoster} />
        </div>

        {match.status === 'toss' && <TossSection match={match} />}
      </div>
    </Layout>
  )
}
