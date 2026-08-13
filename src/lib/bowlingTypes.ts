import type { BowlingType } from '../types'

// Two pairs of entries share a plain-English name (Medium Fast, Fast) but
// describe distinct bowling styles per the source list — disambiguated here
// so the dropdown never shows two identical options.
export const BOWLING_TYPE_LABELS: Record<BowlingType, string> = {
  fastBowler: 'Fast Bowler',
  mediumFastSwingSeam: 'Medium Fast (Swing/Seam)',
  medium: 'Medium',
  fast: 'Fast',
  mediumFastAngleSwing: 'Medium Fast (Angle/Swing)',
  offSpin: 'Off Spin',
  legSpin: 'Leg Spin',
  orthodoxSpin: 'Orthodox Spin',
  chinaman: 'Chinaman / Wrist Spin',
  slowerBallSpecialist: 'Slower Ball Specialist',
  swingBowler: 'Swing Bowler',
  seamBowler: 'Seam Bowler',
}

export const BOWLING_TYPE_OPTIONS: { value: BowlingType; label: string }[] = (
  Object.entries(BOWLING_TYPE_LABELS) as [BowlingType, string][]
).map(([value, label]) => ({ value, label }))
