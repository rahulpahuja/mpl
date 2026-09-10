// Single source of truth for the sports the platform lists. Only Cricket is
// wired up today — every other sport renders as "Coming soon" until it has
// its own flow. Give a sport a `to` to turn its card live.

export interface Sport {
  id: string
  name: string
  icon: string
  to?: string
}

export const SPORTS: Sport[] = [
  { id: 'cricket', name: 'Cricket', icon: '🏏', to: '/home' },
  { id: 'football', name: 'Football', icon: '⚽' },
  { id: 'rugby', name: 'Rugby', icon: '🏉' },
  { id: 'hockey', name: 'Hockey', icon: '🏑' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'badminton', name: 'Badminton', icon: '🏸' },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐' },
  { id: 'baseball', name: 'Baseball', icon: '⚾' },
  { id: 'kabaddi', name: 'Kabaddi', icon: '🤼' },
  { id: 'golf', name: 'Golf', icon: '⛳' },
  { id: 'tableTennis', name: 'Table Tennis', icon: '🏓' },
  { id: 'bikeRacing', name: 'Bike Racing', icon: '🏍️' },
  { id: 'carRacing', name: 'Car Racing', icon: '🏎️' },
  { id: 'f1Racing', name: 'F1 Racing', icon: '🏁' },
]

// Every auction created before the `sport` field existed, and every one
// created without an explicit choice, is a Cricket auction.
export const DEFAULT_SPORT_ID = 'cricket'

export function sportName(id: string | null | undefined): string {
  return SPORTS.find((s) => s.id === id)?.name ?? 'Cricket'
}
