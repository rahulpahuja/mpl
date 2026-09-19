import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { TeamAvatar } from '../components/TeamAvatar'
import { DraftTeamCard } from '../components/DraftCards'
import { useMatchRosters } from '../hooks/useMatchRosters'
import { useMatch } from '../hooks/useMatch'
import { usePageTitle } from '../hooks/usePageTitle'
import { applyDraftToMatch, createDraftMatch } from '../lib/draftMatches'
import { MIN_PLAYING_XI, recordToss, setPlayingXI } from '../lib/matches'
import { useAuthStore } from '../store/authStore'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'
import type { DraftMatch, Match, RosterPlayer, TossDecision } from '../types'

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
  const alreadySaved = team.playingXI.length >= MIN_PLAYING_XI

  function toggle(playerId: string) {
    if (locked) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
        if (captainId === playerId) setCaptainId('')
        if (wicketKeeperId === playerId) setWicketKeeperId('')
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  async function handleSave() {
    if (selected.size < MIN_PLAYING_XI) return
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
    <section className="glass-card p-4">
      <div className="relative z-[3] flex items-center gap-2">
        <TeamAvatar teamName={team.teamName} logoId={team.logoId} logoImage={team.logoImage} jerseyColor={team.jerseyColor} />
        <h2 className="min-w-0 truncate text-base font-medium text-gray-900 dark:text-gray-100">{team.teamName}</h2>
        {alreadySaved && (
          <span className="shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            XI set
          </span>
        )}
      </div>
      <p className="relative z-[3] mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        {selected.size} selected · at least {MIN_PLAYING_XI}
      </p>

      {roster.length === 0 ? (
        <p className="relative z-[3] mt-3 text-sm text-gray-500">
          This team has no roster yet — divide a player pool above, or add players from the{' '}
          <Link to="/admin/teams" className="font-medium text-orange-600 dark:text-orange-400 hover:underline">
            Teams page
          </Link>{' '}
          first.
        </p>
      ) : (
        <ul className="relative z-[3] mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {roster.map((p) => {
            const isSelected = selected.has(p.playerId)
            return (
              <li key={p.playerId}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => toggle(p.playerId)}
                  className={`flex w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                    isSelected
                      ? 'border-orange-400/70 bg-orange-50/80 dark:border-orange-500/50 dark:bg-orange-950/30'
                      : 'border-gray-200/80 dark:border-gray-800/80 hover:bg-white/60 dark:hover:bg-white/5'
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

      {selected.size >= MIN_PLAYING_XI && (
        <div className="relative z-[3] mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Captain</label>
            <select
              value={captainId}
              onChange={(e) => setCaptainId(e.target.value)}
              disabled={locked}
              className="input-glass mt-1 w-full rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
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
              className="input-glass mt-1 w-full rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
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

      {error && <p className="relative z-[3] mt-2 text-sm text-red-600">{error}</p>}
      {!locked && (
        <button
          onClick={handleSave}
          disabled={saving || selected.size < MIN_PLAYING_XI}
          className="btn-brand relative z-[3] mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium sm:w-auto"
        >
          {saving ? 'Saving...' : 'Save Playing XI'}
        </button>
      )}
    </section>
  )
}

// Import players into a shared pool, then two captains take turns picking
// them into the two sides — a Team Draft linked to this match, which every
// participant can open and watch live at /draft/<id>. Once it's finished,
// the organiser applies the result as both sides' rosters and Playing XIs.
function DivideTeamsPanel({ match, draft }: { match: Match; draft: DraftMatch | null }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)!
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const startPool = () =>
    run(async () => navigate(`/draft/${await createDraftMatch(`${match.name} · teams`, user, match.matchId)}`))

  return (
    <section className="glass-card p-4">
      <div className="relative z-[3] space-y-3">
        <div>
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Divide teams</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Import players into a pool, pick two captains, and they take turns picking their side — everyone with the
            link watches the division live.
          </p>
        </div>

        {!draft ? (
          <button type="button" onClick={startPool} disabled={busy} className="btn-brand rounded-lg px-4 py-2.5 text-sm font-medium">
            Import players &amp; divide teams
          </button>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Player pool <span className="font-mono font-semibold tracking-widest">{draft.matchId}</span> ·{' '}
              {draft.players.length} players · share this ID so captains and players can open it from Team Draft.
            </p>
            {draft.status === 'complete' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {draft.teams.map((team, i) => (
                  <DraftTeamCard key={team.captainId} team={team} teamIndex={i} players={draft.players} />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link to={`/draft/${draft.matchId}`} className="btn-glass rounded-lg border px-4 py-2.5 text-sm font-medium">
                {draft.status === 'complete' ? 'View division' : 'Open player pool'}
              </Link>
              {draft.status === 'complete' && draft.linkedMatchId === match.matchId && (
                <button
                  type="button"
                  onClick={() => run(async () => {
                    await applyDraftToMatch(draft, match)
                    setApplied(true)
                  })}
                  disabled={busy}
                  className="btn-brand rounded-lg px-4 py-2.5 text-sm font-medium"
                >
                  {busy ? 'Applying...' : 'Use these teams'}
                </button>
              )}
            </div>
            {draft.status === 'complete' && draft.linkedMatchId === match.matchId && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {draft.teams[0]?.name} plays as {match.teamA.teamName}, {draft.teams[1]?.name} as {match.teamB.teamName}.
              </p>
            )}
            {applied && <p className="text-sm text-green-600 dark:text-green-400">Teams applied — both Playing XIs are set.</p>}
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
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
    <section className="glass-card p-4">
      <h2 className="relative z-[3] text-base font-medium text-gray-900 dark:text-gray-100">Toss</h2>
      <div className="relative z-[3] mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
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
          className="btn-brand rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          {saving ? 'Starting...' : 'Record toss & start match'}
        </button>
      </div>
      {error && <p className="relative z-[3] mt-2 text-sm text-red-600">{error}</p>}
    </section>
  )
}

export function MatchSetup() {
  const { matchId } = useParams<{ matchId: string }>()
  const { match, loading } = useMatch(matchId)
  const { draft, rosterFor } = useMatchRosters(matchId)
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

  const teamARoster = rosterFor(match.teamA.teamId)
  const teamBRoster = rosterFor(match.teamB.teamId)

  return (
    <Layout>
      <div className="apex-arena space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{match.name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {match.dayNight === 'day' ? 'Day match' : 'Night match'} · {match.oversLimit} overs ·{' '}
            {match.ballType === 'tennis' ? 'Tennis ball' : 'Leather ball'} ·{' '}
            {match.groundType === 'box' ? 'Box cricket' : match.groundType === 'gully' ? 'Gully' : 'Ground'}
            {match.tournamentName ? ` · ${match.tournamentName}` : ' · Friendly'}
          </p>
        </div>

        {(match.status === 'live' || match.status === 'inningsBreak' || match.status === 'completed') && (
          <p className="rounded-lg surface-inset backdrop-blur-sm p-3 text-sm text-gray-600 dark:text-gray-400">
            This match is already underway.{' '}
            <Link
              to={match.status === 'completed' ? `/matches/${match.matchId}` : `/score/${match.matchId}`}
              className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
            >
              {match.status === 'completed' ? 'View scorecard' : 'Go to live scorer'}
            </Link>
          </p>
        )}

        {(match.status === 'setup' || match.status === 'toss') && <DivideTeamsPanel match={match} draft={draft} />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SideXIEditor match={match} side="teamA" roster={teamARoster} />
          <SideXIEditor match={match} side="teamB" roster={teamBRoster} />
        </div>

        {match.status === 'toss' && <TossSection match={match} />}
      </div>
    </Layout>
  )
}
