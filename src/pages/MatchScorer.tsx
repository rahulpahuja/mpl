import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { TeamAvatar } from '../components/TeamAvatar'
import { BallCelebration } from '../components/BallCelebration'
import { useAuthStore } from '../store/authStore'
import { useMatch } from '../hooks/useMatch'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { useJustScored } from '../hooks/useJustScored'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatOvers } from '../lib/matchRules'
import { pickBatsman, pickBowler, recordBall, startSecondInnings, undoLastBall } from '../lib/matches'
import type { ScoreBallInput } from '../lib/matchRules'
import type { ExtraType, InningsState, Match, RosterPlayer, WicketType } from '../types'

const WICKET_LABELS: Record<WicketType, string> = {
  bowled: 'Bowled',
  caught: 'Caught',
  lbw: 'LBW',
  runOut: 'Run out',
  stumped: 'Stumped',
  hitWicket: 'Hit wicket',
  retired: 'Retired',
  other: 'Other',
}

function activeInnings(match: Match): InningsState | null {
  return match.currentInnings === 1 ? match.innings1 : match.innings2
}

function rosterFor(teams: ReturnType<typeof useTeamsRegistry>['teams'], teamId: string): RosterPlayer[] {
  return teams.find((t) => t.teamId === teamId)?.roster ?? []
}

function nameFor(roster: RosterPlayer[], playerId: string): string {
  return roster.find((p) => p.playerId === playerId)?.name ?? 'Unknown'
}

function bowlerFigures(innings: InningsState, bowlerId: string): string {
  const b = innings.bowlingStats[bowlerId]
  if (!b) return '0.0-0-0-0'
  return `${formatOvers(b.legalBalls)}-${b.maidens}-${b.runsConceded}-${b.wickets}`
}

function PickPlayer({
  label,
  candidates,
  onPick,
  saving,
}: {
  label: string
  candidates: RosterPlayer[]
  onPick: (p: RosterPlayer) => void
  saving: boolean
}) {
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-red-300/80 bg-red-50/50 backdrop-blur-sm p-4 dark:border-red-900/70 dark:bg-red-950/30">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {candidates.map((p) => (
          <button
            key={p.playerId}
            type="button"
            disabled={saving}
            onClick={() => onPick(p)}
            className="input-glass min-h-11 rounded-lg px-3 py-2 text-left text-sm text-gray-900 hover:bg-white/90 disabled:opacity-50 dark:text-gray-100 dark:hover:bg-gray-800/80"
          >
            {p.name}
          </button>
        ))}
        {candidates.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No eligible players left.</p>}
      </div>
    </div>
  )
}

const RUN_LABELS: Record<ExtraType | 'normal', string> = {
  normal: 'Runs',
  wide: 'Additional runs run (wide)',
  noBall: 'Runs off the bat (no ball)',
  bye: 'Byes',
  legBye: 'Leg byes',
  penalty: 'Penalty runs',
}

function WicketModal({
  innings,
  bowlingRoster,
  onClose,
  onSubmit,
  restrictToRunOut,
  extraType,
  saving,
}: {
  innings: InningsState
  bowlingRoster: RosterPlayer[]
  onClose: () => void
  onSubmit: (input: {
    wicketType: WicketType
    dismissedPlayerId: string
    fielderId: string | null
    fielderName: string | null
    runs: number
  }) => void
  restrictToRunOut: boolean
  extraType: ExtraType | null
  saving: boolean
}) {
  const types: WicketType[] = restrictToRunOut
    ? ['runOut']
    : ['bowled', 'caught', 'lbw', 'runOut', 'stumped', 'hitWicket', 'retired', 'other']
  const [wicketType, setWicketType] = useState<WicketType>(types[0])
  const [dismissedPlayerId, setDismissedPlayerId] = useState(innings.strikerId ?? '')
  const [fielderId, setFielderId] = useState('')
  const [runs, setRuns] = useState(0)

  const needsFielder = wicketType === 'caught' || wicketType === 'stumped' || wicketType === 'runOut'
  const fielder = bowlingRoster.find((p) => p.playerId === fielderId) ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 sm:px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-3 rounded-xl bg-white p-4 shadow-xl sm:p-6 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Wicket{extraType ? ` (${extraType})` : ''}</h2>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">How out</label>
          <select
            value={wicketType}
            onChange={(e) => setWicketType(e.target.value as WicketType)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {WICKET_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        {wicketType === 'runOut' && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Batsman out</label>
            <select
              value={dismissedPlayerId}
              onChange={(e) => setDismissedPlayerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {innings.strikerId && (
                <option value={innings.strikerId}>{innings.battingStats[innings.strikerId]?.name} (striker)</option>
              )}
              {innings.nonStrikerId && (
                <option value={innings.nonStrikerId}>{innings.battingStats[innings.nonStrikerId]?.name}</option>
              )}
            </select>
          </div>
        )}
        {wicketType === 'runOut' && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Runs completed before the run out</label>
            <input
              type="number"
              min={0}
              max={6}
              value={runs}
              onChange={(e) => setRuns(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        )}
        {needsFielder && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Fielder{wicketType === 'stumped' ? ' (wicketkeeper)' : ''}
            </label>
            <select
              value={fielderId}
              onChange={(e) => setFielderId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Select...</option>
              {bowlingRoster.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !dismissedPlayerId || (needsFielder && !fielderId)}
            onClick={() =>
              onSubmit({
                wicketType,
                dismissedPlayerId,
                fielderId: fielderId || null,
                fielderName: fielder?.name ?? null,
                runs: wicketType === 'runOut' ? runs : 0,
              })
            }
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export function MatchScorer() {
  const { matchId } = useParams<{ matchId: string }>()
  const { match, loading } = useMatch(matchId)
  const { teams } = useTeamsRegistry()
  const user = useAuthStore((s) => s.user)
  usePageTitle(match ? `${match.name} · Score` : 'Score match')
  const { event: justScored, clear: clearJustScored } = useJustScored(match)

  const [extraType, setExtraType] = useState<ExtraType | null>(null)
  const [showWicketModal, setShowWicketModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  if (match.status === 'setup' || match.status === 'toss') {
    return <Navigate to={`/admin/matches/${match.matchId}/setup`} replace />
  }
  if (match.status === 'completed' || match.status === 'abandoned') {
    return <Navigate to={`/matches/${match.matchId}`} replace />
  }

  const canScore = !!user && (user.role === 'admin' || user.role === 'auctionManager' || match.scorerIds.includes(user.uid))
  if (!canScore) {
    return (
      <Layout>
        <p className="text-gray-500">You aren't authorized to score this match.</p>
      </Layout>
    )
  }

  if (match.status === 'inningsBreak') {
    const i1 = match.innings1!
    return (
      <Layout>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Innings break</h1>
          <p className="text-gray-700 dark:text-gray-200">
            {match.teamA.teamId === i1.battingTeamId ? match.teamA.teamName : match.teamB.teamName} scored{' '}
            <span className="font-mono font-semibold">
              {i1.totalRuns}/{i1.wickets}
            </span>{' '}
            in {formatOvers(i1.legalBallsBowled)} overs. Target: {i1.totalRuns + 1}.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await startSecondInnings(match.matchId)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to start second innings')
              } finally {
                setBusy(false)
              }
            }}
            className="btn-brand min-h-11 rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            Start second innings
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Layout>
    )
  }

  const innings = activeInnings(match)
  if (!innings) {
    return (
      <Layout>
        <p className="text-gray-500">Innings hasn't started.</p>
      </Layout>
    )
  }

  const battingSide = match.teamA.teamId === innings.battingTeamId ? match.teamA : match.teamB
  const bowlingSide = match.teamA.teamId === innings.bowlingTeamId ? match.teamA : match.teamB
  const battingRoster = rosterFor(teams, battingSide.teamId)
  const bowlingRoster = rosterFor(teams, bowlingSide.teamId)

  const needsBatsman = !innings.strikerId || !innings.nonStrikerId
  const needsBowler = !innings.currentBowlerId
  const alreadyBatted = new Set(Object.keys(innings.battingStats))
  const eligibleBatsmen = battingRoster.filter((p) => battingSide.playingXI.includes(p.playerId) && !alreadyBatted.has(p.playerId))
  const eligibleBowlers = bowlingRoster.filter(
    (p) => bowlingSide.playingXI.includes(p.playerId) && p.playerId !== innings.lastOverBowlerId,
  )

  async function submitBall(input: ScoreBallInput) {
    if (!matchId) return
    setBusy(true)
    setError(null)
    try {
      await recordBall(matchId, input)
      setExtraType(null)
      setShowWicketModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record ball')
    } finally {
      setBusy(false)
    }
  }

  const runrate = innings.legalBallsBowled > 0 ? (innings.totalRuns / (innings.legalBallsBowled / 6)).toFixed(2) : '0.00'
  const requiredRunRate =
    innings.target != null && innings.legalBallsBowled < match.oversLimit * 6
      ? ((innings.target - innings.totalRuns) / ((match.oversLimit * 6 - innings.legalBallsBowled) / 6)).toFixed(2)
      : null

  return (
    <Layout>
      <BallCelebration event={justScored} onDone={clearJustScored} />
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">{match.name}</h1>
          <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            {match.dayNight === 'day' ? 'Day match' : 'Night match'} · {match.oversLimit} overs ·{' '}
            {match.ballType === 'tennis' ? 'Tennis ball' : 'Leather ball'} ·{' '}
            {match.groundType === 'box' ? 'Box cricket' : match.groundType === 'gully' ? 'Gully' : 'Ground'}
            {match.tournamentName ? ` · ${match.tournamentName}` : ''}
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="relative z-[3] flex flex-wrap items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              <TeamAvatar teamName={battingSide.teamName} logoId={battingSide.logoId} logoImage={battingSide.logoImage} jerseyColor={battingSide.jerseyColor} />
              <span className="truncate">{battingSide.teamName}</span>
            </span>
            <span className="font-mono text-2xl font-bold text-red-600 dark:text-red-400">
              {innings.totalRuns}/{innings.wickets}
            </span>
          </div>
          <p className="relative z-[3] mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatOvers(innings.legalBallsBowled)} / {match.oversLimit} overs · RR {runrate}
            {innings.target != null && <> · Target {innings.target}{requiredRunRate ? ` · RRR ${requiredRunRate}` : ''}</>}
          </p>
          {innings.isFreeHit && (
            <span className="relative z-[3] mt-2 inline-block rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Free hit
            </span>
          )}

          <div className="relative z-[3] mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {[innings.strikerId, innings.nonStrikerId].filter(Boolean).map((id) => {
              const b = innings.battingStats[id as string]
              const isStriker = id === innings.strikerId
              return (
                <div key={id} className="flex items-center justify-between rounded-lg bg-white/40 dark:bg-white/5 px-3 py-2">
                  <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                    {isStriker && '• '}
                    {b?.name}
                  </span>
                  <span className="shrink-0 font-mono text-gray-600 dark:text-gray-300">
                    {b?.runs} ({b?.balls})
                  </span>
                </div>
              )
            })}
          </div>
          {innings.currentBowlerId && (
            <div className="relative z-[3] mt-2 flex items-center justify-between rounded-lg bg-white/40 dark:bg-white/5 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                {nameFor(bowlingRoster, innings.currentBowlerId)}
              </span>
              <span className="shrink-0 font-mono text-gray-600 dark:text-gray-300">{bowlerFigures(innings, innings.currentBowlerId)}</span>
            </div>
          )}

          <div className="relative z-[3] mt-3 flex flex-wrap gap-1.5">
            {innings.currentOverBalls.map((b, i) => (
              <span
                key={i}
                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  b.isWicket
                    ? 'bg-red-600 text-white'
                    : b.runs >= 4
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {b.isWicket ? 'W' : b.extraType === 'wide' ? 'wd' : b.extraType === 'noBall' ? 'nb' : b.runs}
              </span>
            ))}
            {innings.currentOverBalls.length === 0 && <span className="text-xs text-gray-400">New over</span>}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {needsBatsman ? (
          <PickPlayer
            label={`Pick ${innings.strikerId ? 'the non-striker' : 'an opening batsman'}`}
            candidates={eligibleBatsmen}
            saving={busy}
            onPick={async (p) => {
              setBusy(true)
              setError(null)
              try {
                await pickBatsman(match.matchId, p.playerId, p.name)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to set batsman')
              } finally {
                setBusy(false)
              }
            }}
          />
        ) : needsBowler ? (
          <PickPlayer
            label="Pick the next over's bowler"
            candidates={eligibleBowlers}
            saving={busy}
            onPick={async (p) => {
              setBusy(true)
              setError(null)
              try {
                await pickBowler(match.matchId, p.playerId, p.name)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to set bowler')
              } finally {
                setBusy(false)
              }
            }}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(['wide', 'noBall', 'bye', 'legBye'] as ExtraType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={busy}
                  onClick={() => setExtraType((cur) => (cur === t ? null : t))}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    extraType === t
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-gray-300/80 dark:border-gray-700/80 text-gray-700 hover:bg-white/60 dark:text-gray-200 dark:hover:bg-white/5'
                  }`}
                >
                  {t === 'wide' ? 'Wide' : t === 'noBall' ? 'No ball' : t === 'bye' ? 'Bye' : 'Leg bye'}
                </button>
              ))}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{RUN_LABELS[extraType ?? 'normal']}</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => submitBall({ runs: n, extraType, isWicket: false, scoredBy: user!.uid })}
                    className="input-glass min-h-14 rounded-lg text-lg font-bold text-gray-900 hover:bg-white/90 disabled:opacity-50 dark:text-gray-100 dark:hover:bg-gray-800/80"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowWicketModal(true)}
                className="min-h-11 flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 sm:flex-none"
              >
                Wicket
              </button>
              <button
                type="button"
                disabled={busy || !match.undoSnapshot}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    await undoLastBall(match.matchId)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Nothing to undo')
                  } finally {
                    setBusy(false)
                  }
                }}
                className="min-h-11 flex-1 rounded-lg border border-gray-300/80 dark:border-gray-700/80 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/60 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-white/5 sm:flex-none"
              >
                Undo last ball
              </button>
            </div>
          </div>
        )}

        <Link
          to={`/matches/${match.matchId}`}
          className="inline-block text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline"
        >
          View full scorecard →
        </Link>

        {showWicketModal && (
          <WicketModal
            innings={innings}
            bowlingRoster={bowlingRoster}
            onClose={() => setShowWicketModal(false)}
            saving={busy}
            extraType={extraType}
            restrictToRunOut={innings.isFreeHit || extraType === 'wide' || extraType === 'noBall'}
            onSubmit={(w) =>
              submitBall({
                runs: w.runs,
                extraType,
                isWicket: true,
                wicketType: w.wicketType,
                dismissedPlayerId: w.dismissedPlayerId,
                fielderId: w.fielderId,
                fielderName: w.fielderName,
                scoredBy: user!.uid,
              })
            }
          />
        )}
      </div>
    </Layout>
  )
}
