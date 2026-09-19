import { draftSideRoster } from '../lib/draftMatches'
import { useLinkedDraft } from './useLinkedDraft'
import { useTeamsRegistry } from './useTeamsRegistry'
import type { RosterPlayer } from '../types'

// A match side's squad: its registry team's roster, or — for a match divided
// on the Android app, whose sides are draft teams rather than registry teams
// — the players drafted onto that side.
export function useMatchRosters(matchId: string | undefined) {
  const { teams } = useTeamsRegistry()
  const draft = useLinkedDraft(matchId)

  function rosterFor(teamId: string): RosterPlayer[] {
    const registryRoster = teams.find((t) => t.teamId === teamId)?.roster ?? []
    return registryRoster.length > 0 || !draft ? registryRoster : draftSideRoster(draft, teamId)
  }

  return { draft, rosterFor }
}
