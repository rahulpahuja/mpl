import { usePlayerStats } from '../hooks/usePlayerStats'
import { battingAverage, bowlingAverage, economyRate, strikeRate } from '../lib/matchFormat'

function fmt(n: number | null): string {
  return n == null ? '-' : n.toFixed(2)
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 text-center dark:bg-gray-900">
      <p className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}

// Career numbers accumulated automatically off every completed match's final
// scorecard (see lib/playerStats.ts) — matches played, batting/bowling/
// fielding/wicket-keeping. Averages, strike rate, and economy are always
// derived here from the raw counters (never stored) so they can't drift.
export function CareerStats({ playerId }: { playerId: string }) {
  const { stats, loading } = usePlayerStats(playerId)

  if (loading) return null
  if (!stats || stats.matchesPlayed === 0) {
    return (
      <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Career stats</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No matches played yet — stats fill in automatically once you've played in a hosted match.
        </p>
      </div>
    )
  }

  const b = stats.batting
  const bowl = stats.bowling
  const avg = battingAverage(b.runs, b.innings, b.notOuts)
  const sr = strikeRate(b.runs, b.balls)
  const bowlAvg = bowlingAverage(bowl.runsConceded, bowl.wickets)
  const econ = economyRate(bowl.runsConceded, bowl.legalBalls)
  const hasBowled = bowl.innings > 0
  const hasKept = stats.wicketKeeping.dismissals > 0

  return (
    <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Career stats</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{stats.matchesPlayed} matches played</p>

      <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Batting</h3>
      <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
        <StatTile label="Runs" value={b.runs} />
        <StatTile label="Average" value={fmt(avg)} />
        <StatTile label="Strike rate" value={fmt(sr)} />
        <StatTile label="High score" value={b.highScore} />
        <StatTile label="4s" value={b.fours} />
        <StatTile label="6s" value={b.sixes} />
        <StatTile label="Not outs" value={b.notOuts} />
        <StatTile label="Innings" value={b.innings} />
      </div>
      {(b.twentyFives || b.fifties || b.hundreds || b.twoHundreds || b.threeHundreds || b.fourHundreds) > 0 && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Milestones: {b.twentyFives} × 25+, {b.fifties} × 50+, {b.hundreds} × 100+
          {b.twoHundreds > 0 && `, ${b.twoHundreds} × 200+`}
          {b.threeHundreds > 0 && `, ${b.threeHundreds} × 300+`}
          {b.fourHundreds > 0 && `, ${b.fourHundreds} × 400+`}
        </p>
      )}

      {hasBowled && (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Bowling</h3>
          <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
            <StatTile label="Wickets" value={bowl.wickets} />
            <StatTile label="Average" value={fmt(bowlAvg)} />
            <StatTile label="Economy" value={fmt(econ)} />
            <StatTile label="Best" value={`${bowl.bestWickets}/${bowl.bestRuns}`} />
            <StatTile label="Maidens" value={bowl.maidens} />
            <StatTile label="4s conceded" value={bowl.fours} />
            <StatTile label="6s conceded" value={bowl.sixes} />
            <StatTile label="Innings" value={bowl.innings} />
          </div>
          {(bowl.threeWicketHauls || bowl.fiveWicketHauls || bowl.sevenWicketHauls || bowl.tenWicketHauls) > 0 && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Hauls: {bowl.threeWicketHauls} × 3W, {bowl.fiveWicketHauls} × 5W
              {bowl.sevenWicketHauls > 0 && `, ${bowl.sevenWicketHauls} × 7W`}
              {bowl.tenWicketHauls > 0 && `, ${bowl.tenWicketHauls} × 10W`}
            </p>
          )}
        </>
      )}

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Fielding</h3>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        <StatTile label="Catches" value={stats.fielding.catches} />
        <StatTile label="Run outs" value={stats.fielding.runOuts} />
        <StatTile label="Stumpings" value={stats.fielding.stumpings} />
      </div>

      {hasKept && (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Wicketkeeping
          </h3>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <StatTile label="Dismissals" value={stats.wicketKeeping.dismissals} />
            <StatTile label="Stumpings" value={stats.wicketKeeping.stumpings} />
            <StatTile label="Catches" value={stats.wicketKeeping.catchesAsKeeper} />
          </div>
        </>
      )}
    </div>
  )
}
