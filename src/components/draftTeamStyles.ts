// Team 1 is blue, Team 2 is orange — same split as the Android app's
// draftTeamColor, so both clients colour a draft identically.
export const DRAFT_TEAM_STYLES = [
  { ring: 'ring-blue-500', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-600' },
  { ring: 'ring-orange-500', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-500' },
] as const
