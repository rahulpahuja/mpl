import type { UserRole } from '../types'

export interface NavDestination {
  to: string
  label: string
  // Omitted means every signed-in role can reach it (e.g. Home, Profile).
  roles?: UserRole[]
  end?: boolean
  section: 'global' | 'admin'
  // Two-key chord (e.g. "g t") — press the first key, then the second within
  // CHORD_TIMEOUT_MS (see hooks/useGlobalKeyboardShortcuts.ts).
  chord: string
}

// Single source of truth for "where can a signed-in user go" — both AdminNav
// (which renders the admin tab strip) and useGlobalKeyboardShortcuts (which
// wires up "g <letter>" navigation) read from this list, so a new admin page
// only needs to be added here once.
export const NAV_DESTINATIONS: NavDestination[] = [
  { to: '/', label: 'Home', section: 'global', chord: 'g h' },
  { to: '/profile', label: 'Profile', section: 'global', chord: 'g p' },
  { to: '/admin', label: 'Auctions', end: true, roles: ['admin'], section: 'admin', chord: 'g a' },
  { to: '/admin/teams', label: 'Teams', roles: ['admin', 'auctionManager'], section: 'admin', chord: 'g t' },
  { to: '/admin/venues', label: 'Venues', roles: ['admin', 'auctionManager'], section: 'admin', chord: 'g v' },
  { to: '/admin/users', label: 'Users', roles: ['admin', 'auctionManager'], section: 'admin', chord: 'g u' },
  // "g l" (not "g p") — "p" is already Profile above.
  { to: '/admin/players', label: 'Players', roles: ['admin', 'auctionManager'], section: 'admin', chord: 'g l' },
  { to: '/admin/filen-test', label: 'Filen test', roles: ['admin'], section: 'admin', chord: 'g f' },
]
