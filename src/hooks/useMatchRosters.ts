import { draftSideRoster } from '../lib/draftMatches'
import { useDraftMatch } from './useDraftMatch'
import { useTeamsRegistry } from './useTeamsRegistry'
import type { RosterPlayer } from '../types'

// A match side's squad: its registry team's roster, or — for a match started
// from a Team Draft on the Android app, which shares the draft's ID and uses
// draft teams as its sides — the players drafted onto that side.
export function useMatchRosters(matchId: string | undefined) {
  const { teams } = useTeamsRegistry()
  const { match: draft } = useDraftMatch(matchId)

  function rosterFor(teamId: string): RosterPlayer[] {
    const registryRoster = teams.find((t) => t.teamId === teamId)?.roster ?? []
    return registryRoster.length > 0 || !draft ? registryRoster : draftSideRoster(draft, teamId)
  }

  return { rosterFor }
}
