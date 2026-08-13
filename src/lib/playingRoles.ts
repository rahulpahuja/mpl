import type { PlayingRole } from '../types'

export const PLAYING_ROLE_LABELS: Record<PlayingRole, string> = {
  batsman: 'Batsmen',
  bowler: 'Bowler',
  battingAllRounder: 'Batting All Rounder',
  bowlingAllRounder: 'Bowling All Rounder',
  wicketKeeperBatsman: 'Wicket Keeper Batsmen',
}

export const PLAYING_ROLE_OPTIONS: { value: PlayingRole; label: string }[] = (
  Object.entries(PLAYING_ROLE_LABELS) as [PlayingRole, string][]
).map(([value, label]) => ({ value, label }))
