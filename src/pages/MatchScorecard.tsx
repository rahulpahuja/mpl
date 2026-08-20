import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { TeamAvatar } from '../components/TeamAvatar'
import { useMatch } from '../hooks/useMatch'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatOvers } from '../lib/matchRules'
import { bowlingAverage, economyRate, formatDismissal, strikeRate } from '../lib/matchFormat'
import type { InningsState, Match } from '../types'

function num(n: number | null, digits = 2): string {
  return n == null ? '-' : n.toFixed(digits)
}

function InningsScorecard({ match, innings }: { match: Match; innings: InningsState }) {
  const battingSide = match.teamA.teamId === innings.battingTeamId ? match.teamA : match.teamB
  const bowlingSide = match.teamA.teamId === innings.bowlingTeamId ? match.teamA : match.teamB
  const batsmen = Object.values(innings.battingStats).sort((a, b) => a.battingOrder - b.battingOrder)
  const bowlers = Object.values(innings.bowlingStats)
  const extrasTotal =
    innings.extras.wides + innings.extras.noBalls + innings.extras.byes + innings.extras.legByes + innings.extras.penalty

  return (
    <div className="glass-card space-y-6 p-4 sm:p-6">
      <div className="relative z-[3] flex items-center gap-2">
        <TeamAvatar teamName={battingSide.teamName} logoId={battingSide.logoId} logoImage={battingSide.logoImage} jerseyColor={battingSide.jerseyColor} />
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {battingSide.teamName} — {innings.totalRuns}/{innings.wickets} ({formatOvers(innings.legalBallsBowled)} ov)
        </h2>
      </div>

      <div className="relative z-[3] overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="py-2 pr-2 font-medium">Batter</th>
              <th className="py-2 pr-2 font-medium">Dismissal</th>
              <th className="py-2 pr-2 text-right font-medium">R</th>
              <th className="py-2 pr-2 text-right font-medium">B</th>
              <th className="py-2 pr-2 text-right font-medium">4s</th>
              <th className="py-2 pr-2 text-right font-medium">6s</th>
              <th className="py-2 pr-2 text-right font-medium">SR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {batsmen.map((b) => (
              <tr key={b.playerId}>
                <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">{b.name}</td>
                <td className="py-2 pr-2 text-gray-500 dark:text-gray-400">{formatDismissal(b)}</td>
                <td className="py-2 pr-2 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">{b.runs}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{b.balls}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{b.fours}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{b.sixes}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{num(strikeRate(b.runs, b.balls))}</td>
              </tr>
            ))}
            {batsmen.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-gray-500">
                  No batting yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="relative z-[3] text-sm text-gray-600 dark:text-gray-400">
        <p>
          Extras: {extrasTotal} (wd {innings.extras.wides}, nb {innings.extras.noBalls}, b {innings.extras.byes}, lb{' '}
          {innings.extras.legByes}
          {innings.extras.penalty > 0 ? `, pen ${innings.extras.penalty}` : ''})
        </p>
        <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
          Total: {innings.totalRuns}/{innings.wickets} in {formatOvers(innings.legalBallsBowled)} overs
        </p>
      </div>

      {innings.fallOfWickets.length > 0 && (
        <p className="relative z-[3] text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Fall of wickets: </span>
          {innings.fallOfWickets.map((fw, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {fw.wicket}-{fw.runs} ({fw.playerName}, {fw.overSummary})
            </span>
          ))}
        </p>
      )}

      <div className="relative z-[3] flex items-center gap-2">
        <TeamAvatar teamName={bowlingSide.teamName} logoId={bowlingSide.logoId} logoImage={bowlingSide.logoImage} jerseyColor={bowlingSide.jerseyColor} />
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{bowlingSide.teamName} bowling</h3>
      </div>
      <div className="relative z-[3] overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="py-2 pr-2 font-medium">Bowler</th>
              <th className="py-2 pr-2 text-right font-medium">O</th>
              <th className="py-2 pr-2 text-right font-medium">M</th>
              <th className="py-2 pr-2 text-right font-medium">R</th>
              <th className="py-2 pr-2 text-right font-medium">W</th>
              <th className="py-2 pr-2 text-right font-medium">Econ</th>
              <th className="py-2 pr-2 text-right font-medium">4s</th>
              <th className="py-2 pr-2 text-right font-medium">6s</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {bowlers.map((b) => (
              <tr key={b.playerId}>
                <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">{b.name}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{formatOvers(b.legalBalls)}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{b.maidens}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{b.runsConceded}</td>
                <td className="py-2 pr-2 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">{b.wickets}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">
                  {num(economyRate(b.runsConceded, b.legalBalls))}
                </td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{b.fours}</td>
                <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{b.sixes}</td>
              </tr>
            ))}
            {bowlers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-3 text-gray-500">
                  No bowling yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {bowlers.some((b) => bowlingAverage(b.runsConceded, b.wickets) != null) && (
        <p className="relative z-[3] text-xs text-gray-400">
          Best figures this innings:{' '}
          {[...bowlers].sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0]?.name}
        </p>
      )}
    </div>
  )
}

export function MatchScorecard() {
  const { matchId } = useParams<{ matchId: string }>()
  const { match, loading } = useMatch(matchId)
  usePageTitle(match ? `${match.teamA.teamName} vs ${match.teamB.teamName} · Scorecard` : 'Scorecard')
  const [tab, setTab] = useState<1 | 2>(1)

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

  const activeInnings = tab === 1 ? match.innings1 : match.innings2

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
              {match.teamA.teamName} <span className="text-gray-400">vs</span> {match.teamB.teamName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {match.format === 'tournament' && match.tournamentName ? `${match.tournamentName} · ` : 'Friendly · '}
              {match.oversLimit} overs · {match.dayNight === 'day' ? 'Day' : 'Night'} ·{' '}
              {match.ballType === 'tennis' ? 'Tennis ball' : 'Leather ball'} ·{' '}
              {match.groundType === 'box' ? 'Box cricket' : match.groundType === 'gully' ? 'Gully' : 'Ground'}
              {match.venueName ? ` · ${match.venueName}` : ''}
            </p>
          </div>
          {match.status !== 'completed' && match.status !== 'setup' && (
            <Link
              to={`/watch/${match.matchId}`}
              className="rounded-lg border border-gray-300/80 dark:border-gray-700/80 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/60 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Live view
            </Link>
          )}
        </div>

        {match.result && (
          <div className="rounded-lg border border-amber-300/80 bg-amber-50/70 dark:border-amber-700/70 dark:bg-amber-900/30 backdrop-blur-sm p-4 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-300">{match.result}</p>
          </div>
        )}

        {match.innings1 && match.innings2 && (
          <div className="edge-fade-x flex w-fit gap-1 overflow-x-auto rounded-full border border-white/60 dark:border-white/10 bg-white/50 dark:bg-gray-900/40 p-1 backdrop-blur-md">
            {[1, 2].map((n) => (
              <button
                key={n}
                onClick={() => setTab(n as 1 | 2)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === n
                    ? 'tab-brand'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Innings {n}
              </button>
            ))}
          </div>
        )}

        {activeInnings ? (
          <InningsScorecard match={match} innings={activeInnings} />
        ) : (
          <p className="text-sm text-gray-500">Play hasn't started yet.</p>
        )}
      </div>
    </Layout>
  )
}
