// Pure display-formatting helpers for match/career stats — kept separate
// from matchRules.ts (the scoring engine) since these never feed back into
// stored state, only render it. Rates/averages are always derived here from
// raw counters rather than stored, so they can't drift out of sync with the
// underlying totals (same convention as the rest of this app — see
// PlayerStats' doc comment in types/index.ts).
import type { BatsmanInningsStat } from '../types'

export function battingAverage(runs: number, innings: number, notOuts: number): number | null {
  const dismissals = innings - notOuts
  if (dismissals <= 0) return null
  return runs / dismissals
}

export function strikeRate(runs: number, balls: number): number | null {
  if (balls <= 0) return null
  return (runs / balls) * 100
}

export function bowlingAverage(runsConceded: number, wickets: number): number | null {
  if (wickets <= 0) return null
  return runsConceded / wickets
}

export function economyRate(runsConceded: number, legalBalls: number): number | null {
  if (legalBalls <= 0) return null
  return runsConceded / (legalBalls / 6)
}

// Standard scorecard notation: "c Sharma b Kumar", "b Kumar", "lbw b Kumar",
// "st Patel b Kumar", "run out (Patel)", "c & b Kumar", "not out".
export function formatDismissal(entry: Pick<BatsmanInningsStat, 'isOut' | 'dismissal'>): string {
  if (!entry.isOut) return 'not out'
  const d = entry.dismissal
  if (!d) return 'out'
  const bowler = d.bowlerName ?? 'bowler'
  switch (d.type) {
    case 'bowled':
      return `b ${bowler}`
    case 'lbw':
      return `lbw b ${bowler}`
    case 'hitWicket':
      return `hit wicket b ${bowler}`
    case 'stumped':
      return `st ${d.fielderName ?? 'wk'} b ${bowler}`
    case 'caught':
      return d.fielderId && d.fielderId === d.bowlerId ? `c & b ${bowler}` : `c ${d.fielderName ?? 'fielder'} b ${bowler}`
    case 'runOut':
      return d.fielderName ? `run out (${d.fielderName})` : 'run out'
    case 'retired':
      return 'retired hurt'
    default:
      return 'out'
  }
}
