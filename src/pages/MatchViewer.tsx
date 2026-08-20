import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { TeamAvatar } from '../components/TeamAvatar'
import { BallCelebration } from '../components/BallCelebration'
import { useMatch } from '../hooks/useMatch'
import { useJustScored } from '../hooks/useJustScored'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatOvers } from '../lib/matchRules'
import { economyRate, strikeRate } from '../lib/matchFormat'
import type { CurrentOverBall, InningsState } from '../types'

function num(n: number | null, digits = 2): string {
  return n == null ? '-' : n.toFixed(digits)
}

function runRate(totalRuns: number, legalBallsBowled: number): string {
  if (legalBallsBowled === 0) return '0.00'
  return (totalRuns / (legalBallsBowled / 6)).toFixed(2)
}

function ballLabel(b: CurrentOverBall): string {
  if (b.isWicket) return 'W'
  if (b.extraType === 'wide') return `${b.runs}wd`
  if (b.extraType === 'noBall') return `${b.runs}nb`
  if (b.extraType === 'bye') return `${b.runs}b`
  if (b.extraType === 'legBye') return `${b.runs}lb`
  return String(b.runs)
}

function BattingLine({ innings, playerId }: { innings: InningsState; playerId: string | null }) {
  if (!playerId) return null
  const entry = innings.battingStats[playerId]
  if (!entry) return null
  const onStrike = innings.strikerId === playerId
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
        {onStrike && <span className="mr-1 text-red-600 dark:text-red-400">●</span>}
        {entry.name}
      </span>
      <span className="shrink-0 font-mono text-gray-600 dark:text-gray-400">
        {entry.runs} ({entry.balls}) · SR {num(strikeRate(entry.runs, entry.balls))}
      </span>
    </div>
  )
}

export function MatchViewer() {
  const { matchId } = useParams<{ matchId: string }>()
  const { match, loading } = useMatch(matchId)
  usePageTitle(match ? `${match.teamA.teamName} vs ${match.teamB.teamName} · Live` : 'Live match')
  const { event: justScored, clear: clearJustScored } = useJustScored(match)

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

  const innings = match.currentInnings === 1 ? match.innings1 : match.innings2
  const battingSide = innings ? (innings.battingTeamId === match.teamA.teamId ? match.teamA : match.teamB) : null
  const bowlingSide = innings ? (innings.battingTeamId === match.teamA.teamId ? match.teamB : match.teamA) : null
  const bowler = innings?.currentBowlerId ? innings.bowlingStats[innings.currentBowlerId] : null

  return (
    <Layout>
      <BallCelebration event={justScored} onDone={clearJustScored} />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
              {match.teamA.teamName} <span className="text-gray-400">vs</span> {match.teamB.teamName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {match.format === 'tournament' && match.tournamentName ? `${match.tournamentName} · ` : ''}
              {match.oversLimit} overs · {match.dayNight === 'day' ? 'Day' : 'Night'} ·{' '}
              {match.ballType === 'tennis' ? 'Tennis ball' : 'Leather ball'} ·{' '}
              {match.groundType === 'box' ? 'Box cricket' : match.groundType === 'gully' ? 'Gully' : 'Ground'} · Status: {match.status}
            </p>
          </div>
          <Link
            to={`/matches/${match.matchId}`}
            className="rounded-lg border border-gray-300/80 dark:border-gray-700/80 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/60 dark:text-gray-200 dark:hover:bg-white/5"
          >
            Full scorecard
          </Link>
        </div>

        {match.status === 'completed' && match.result && (
          <div className="rounded-lg border border-amber-300/80 bg-amber-50/70 dark:border-amber-700/70 dark:bg-amber-900/30 backdrop-blur-sm p-4 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-300">{match.result}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[match.teamA, match.teamB].map((side) => (
            <div key={side.teamId} className="glass-card flex items-center gap-3 p-4">
            <div className="relative z-[3] flex items-center gap-3">
              <TeamAvatar teamName={side.teamName} logoId={side.logoId} logoImage={side.logoImage} jerseyColor={side.jerseyColor} size={12} />
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {side.teamName}
                  {battingSide?.teamId === side.teamId && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      batting
                    </span>
                  )}
                </p>
                {(() => {
                  const sideInnings = match.innings1?.battingTeamId === side.teamId ? match.innings1 : match.innings2?.battingTeamId === side.teamId ? match.innings2 : null
                  return sideInnings ? (
                    <p className="font-mono text-lg text-gray-900 dark:text-gray-100">
                      {sideInnings.totalRuns}/{sideInnings.wickets}
                      <span className="ml-1 text-sm text-gray-500">({formatOvers(sideInnings.legalBallsBowled)} ov)</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Yet to bat</p>
                  )
                })()}
              </div>
            </div>
            </div>
          ))}
        </div>

        {!innings ? (
          <p className="text-sm text-gray-500">Match hasn't started yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="glass-card space-y-4 p-6 lg:col-span-2">
              <div className="relative z-[3] flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {battingSide?.teamName} batting
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">RR {runRate(innings.totalRuns, innings.legalBallsBowled)}</span>
              </div>

              {innings.isFreeHit && (
                <span className="relative z-[3] inline-block rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">
                  FREE HIT
                </span>
              )}

              <div className="relative z-[3] space-y-1.5 rounded-lg bg-white/40 dark:bg-white/5 p-3">
                {battingSide && (
                  <>
                    <BattingLine innings={innings} playerId={innings.strikerId} />
                    <BattingLine innings={innings} playerId={innings.nonStrikerId} />
                  </>
                )}
              </div>

              {bowler && (
                <div className="relative z-[3] flex items-center justify-between gap-2 rounded-lg bg-white/40 dark:bg-white/5 p-3 text-sm">
                  <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">{bowler.name}</span>
                  <span className="shrink-0 font-mono text-gray-600 dark:text-gray-400">
                    {formatOvers(bowler.legalBalls)}-{bowler.maidens}-{bowler.runsConceded}-{bowler.wickets} · Econ{' '}
                    {num(economyRate(bowler.runsConceded, bowler.legalBalls))}
                  </span>
                </div>
              )}

              <div className="relative z-[3]">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">This over</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {innings.currentOverBalls.map((b, i) => (
                    <span
                      key={i}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 font-mono text-xs font-semibold ${
                        b.isWicket
                          ? 'bg-red-600 text-white'
                          : b.runs >= 4
                            ? 'bg-emerald-600 text-white'
                            : b.extraType
                              ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {ballLabel(b)}
                    </span>
                  ))}
                  {innings.currentOverBalls.length === 0 && <span className="text-xs text-gray-400">No balls yet this over.</span>}
                </div>
              </div>

              {innings.inningsNumber === 2 && innings.target != null && (
                <div className="relative z-[3] rounded-lg bg-red-50/70 dark:bg-red-900/20 backdrop-blur-sm p-3 text-sm">
                  <p className="text-red-700 dark:text-red-300">
                    Need {Math.max(innings.target - innings.totalRuns, 0)} runs from{' '}
                    {Math.max(match.oversLimit * 6 - innings.legalBallsBowled, 0)} balls
                  </p>
                </div>
              )}
            </section>

            <section className="glass-card p-6">
              <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">Extras</h2>
              <ul className="relative z-[3] mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>Wides: {innings.extras.wides}</li>
                <li>No balls: {innings.extras.noBalls}</li>
                <li>Byes: {innings.extras.byes}</li>
                <li>Leg byes: {innings.extras.legByes}</li>
                {innings.extras.penalty > 0 && <li>Penalty: {innings.extras.penalty}</li>}
              </ul>

              {bowlingSide && (
                <div className="relative z-[3] mt-4 flex items-center gap-2">
                  <TeamAvatar
                    teamName={bowlingSide.teamName}
                    logoId={bowlingSide.logoId}
                    logoImage={bowlingSide.logoImage}
                    jerseyColor={bowlingSide.jerseyColor}
                  />
                  <span className="truncate text-sm text-gray-600 dark:text-gray-400">{bowlingSide.teamName} bowling</span>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </Layout>
  )
}
