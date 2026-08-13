import type { BattingType } from '../types'

export const BATTING_TYPE_LABELS: Record<BattingType, string> = {
  aggressiveBatsman: 'Aggressive Batsman',
  defensiveBatsman: 'Defensive Batsman',
  anchorBatsman: 'Anchor Batsman',
  powerHitter: 'Power Hitter',
  allRoundStrokePlayer: 'All-round Stroke Player',
  finisher: 'Finisher',
  technicallySoundBatsman: 'Technically Sound Batsman',
  unorthodoxBatsman: 'Unorthodox Batsman',
}

export const BATTING_TYPE_OPTIONS: { value: BattingType; label: string }[] = (
  Object.entries(BATTING_TYPE_LABELS) as [BattingType, string][]
).map(([value, label]) => ({ value, label }))
