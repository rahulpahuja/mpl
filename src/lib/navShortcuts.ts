import type { UserRole } from '../types'

export interface NavDestination {
  to: string
  label: string
  // Omitted means every signed-in role can reach it (e.g. Home, Profile).
  roles?: UserRole[]
  end?: boolean
  // 'admin' renders in the AdminNav tab strip; 'drawer' in the top-left
  // navigation drawer (see components/NavDrawer.tsx); 'global' in neither.
  section: 'global' | 'admin' | 'drawer'
  // Two-key chord (e.g. "g t") — press the first key, then the second within
  // CHORD_TIMEOUT_MS (see hooks/useGlobalKeyboardShortcuts.ts).
  chord: string
  // Material Symbols icon name — only used by the drawer.
  icon?: string
  // Sub-heading the drawer groups this item under — only used by the drawer.
  group?: 'Main' | 'Account'
}

// Order the drawer renders its section headings in.
export const DRAWER_GROUPS = ['Main', 'Account'] as const

// Single source of truth for "where can a signed-in user go" — AdminNav (the
// admin tab strip), NavDrawer (the top-left menu) and useGlobalKeyboardShortcuts
// ("g <letter>" navigation) all read from this list, so a new page only needs
// to be added here once.
export const NAV_DESTINATIONS: NavDestination[] = [
  { to: '/home', label: 'Home', section: 'drawer', chord: 'g h', icon: 'home', group: 'Main' },
  { to: '/settings', label: 'Settings', roles: ['admin'], section: 'drawer', chord: 'g s', icon: 'settings', group: 'Main' },
  { to: '/admin/users', label: 'Users', roles: ['admin', 'auctionManager'], section: 'drawer', chord: 'g u', icon: 'group', group: 'Main' },
  { to: '/admin/venues', label: 'Venues', roles: ['admin', 'auctionManager'], section: 'drawer', chord: 'g v', icon: 'stadium', group: 'Main' },
  { to: '/profile', label: 'Profile', section: 'drawer', chord: 'g p', icon: 'account_circle', group: 'Account' },
  { to: '/docs', label: 'Help', section: 'drawer', chord: 'g d', icon: 'help', group: 'Account' },
  { to: '/admin', label: 'Auctions', end: true, roles: ['admin'], section: 'admin', chord: 'g a', icon: 'gavel' },
  { to: '/admin/teams', label: 'Teams', roles: ['admin', 'auctionManager'], section: 'admin', chord: 'g t', icon: 'groups' },
  // "g l" (not "g p") — "p" is already Profile above.
  { to: '/admin/players', label: 'Players', roles: ['admin', 'auctionManager'], section: 'admin', chord: 'g l', icon: 'person' },
  { to: '/admin/matches', label: 'Matches', roles: ['admin', 'auctionManager'], section: 'admin', chord: 'g m', icon: 'sports_cricket' },
  {
    to: '/admin/tournaments',
    label: 'Tournaments',
    roles: ['admin', 'auctionManager'],
    section: 'admin',
    chord: 'g o',
    icon: 'emoji_events',
  },
]
