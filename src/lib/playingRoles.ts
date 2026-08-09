import type { PlayingRole } from '../types'

export const PLAYING_ROLE_LABELS: Record<PlayingRole, string> = {
  batsman: 'Batsman',
  bowler: 'Bowler',
  allRounder: 'All-rounder',
  wicketKeeper: 'Wicket-keeper',
}

export const PLAYING_ROLE_OPTIONS: { value: PlayingRole; label: string }[] = (
  Object.entries(PLAYING_ROLE_LABELS) as [PlayingRole, string][]
).map(([value, label]) => ({ value, label }))
