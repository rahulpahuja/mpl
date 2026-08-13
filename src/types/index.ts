import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'auctionManager' | 'manager' | 'player' | 'viewer'

export type Handedness = 'left' | 'right'

export type PlayingRole =
  | 'batsman'
  | 'bowler'
  | 'allRounder'
  | 'battingAllRounder'
  | 'bowlingAllRounder'
  | 'legSpinner'
  | 'offSpinner'
  | 'legOffSpinner'
  | 'wicketKeeper'

export type BowlingType =
  | 'fastBowler'
  | 'mediumFastSwingSeam'
  | 'medium'
  | 'fast'
  | 'mediumFastAngleSwing'
  | 'offSpin'
  | 'legSpin'
  | 'orthodoxSpin'
  | 'chinaman'
  | 'slowerBallSpecialist'
  | 'swingBowler'
  | 'seamBowler'

export interface AppUser {
  uid: string
  email: string
  displayName: string
  photoURL?: string | null
  role: UserRole
  assignedAuctions: string[]
  phone: string
  whatsapp: string
  location: string
  battingHandedness?: Handedness
  bowlingHandedness?: Handedness
  playingRole?: PlayingRole
  bowlingType?: BowlingType
  playerRequested?: boolean
  // Short code assigned once at onboarding (see ensureUserDoc in lib/auth.ts).
  // Lets an Admin add someone as a team manager by ID instead of searching by
  // name/email/phone. Optional because users created before this field existed
  // won't have one until the backfill script runs.
  userCode?: string
  // AES-GCM ciphertext (IV + payload, base64-encoded) of a compressed photo
  // data URL — see lib/crypto.ts and lib/imageProcessing.ts. Never store the
  // plaintext data URL directly on the user doc.
  encryptedPhoto?: string | null
  // Preset avatar id (see lib/avatars.ts), for users who'd rather pick one of
  // these than upload their own photo. Mutually exclusive with encryptedPhoto
  // — setting one clears the other, see lib/users.ts.
  avatarId?: string | null
  // Shirt number a player wears, picked from their own profile. No uniqueness
  // constraint across a team — teams reconcile clashes themselves.
  jerseyNumber?: number | null
}

export type PlayerStatus = 'open' | 'active' | 'sold' | 'unsold'

export interface Player {
  playerId: string
  name: string
  position: string
  basePrice: number
  currentBid: number
  currentBidder: string | null
  currentBidderName: string | null
  status: PlayerStatus
}

export interface TeamManagerEntry {
  teamId: string
  managerId: string
  name: string
  maxPlayers: number
  purse: number
  tokensSpent: number
  remainingTokens: number
  // Snapshotted from Team.logoId at addTeamToAuction time — same
  // never-re-synced-after-add caveat as `name`, see lib/auctions.ts.
  logoId?: string | null
  // Same snapshot caveat as logoId, for Team.logoImage/jerseyColor.
  logoImage?: string | null
  jerseyColor?: string | null
}

export type AuctionStatus = 'draft' | 'live' | 'completed'

export interface Auction {
  auctionId: string
  name: string
  status: AuctionStatus
  createdAt: Timestamp
  startTime: Timestamp | null
  createdBy: string
  bidIncrement: number
  auctionManagerIds: string[]
  teamManagerIds: string[]
  currentPlayerId: string | null
  timerDurationSeconds: number
  timerEndsAt: Timestamp | null
  players: Player[]
  teamManagers: TeamManagerEntry[]
  // Hex color (e.g. "#111827") the Auction Manager picks to theme this
  // auction's pages — see components/AuctionBackground.tsx.
  bgColor?: string | null
}

export interface BidEntry {
  managerId: string
  managerName: string
  amount: number
  timestamp: number
}

export interface PlayerBids {
  playerId: string
  bids: BidEntry[]
  finalBidder: string | null
  finalAmount: number | null
  awardedAt: Timestamp | null
}

export interface TeamPlayerRecord {
  playerId: string
  playerName: string
  soldAt: number
}

export interface AuctionTeamStats {
  teamId: string
  teamName: string
  managerId: string
  logoId?: string | null
  logoImage?: string | null
  jerseyColor?: string | null
  initialPurse: number
  spent: number
  balance: number
  players: TeamPlayerRecord[]
}

export interface Team {
  teamId: string
  teamName: string
  managerId: string
  managerName: string
  // Preset logo id (see lib/avatars.ts DEFAULT_AVATARS) — teams reuse the
  // same preset set as user avatars rather than a separate icon library.
  // Mutually exclusive with logoImage — setting one clears the other, see
  // lib/teams.ts.
  logoId?: string | null
  // Compressed JPEG data URL (see lib/imageProcessing.ts) of an uploaded team
  // logo. Unlike profile photos this isn't encrypted — a team logo isn't
  // personal data, same reasoning as Venue.images.
  logoImage?: string | null
  // Hex color (e.g. "#dc2626") picked via a color input, shown as the team's
  // jersey color.
  jerseyColor?: string | null
  createdAt: Timestamp
}

export interface Invite {
  email: string
  role: UserRole
  createdAt: Timestamp
}

export interface Venue {
  venueId: string
  name: string
  location: string
  // Compressed JPEG data URLs (see lib/imageProcessing.ts), capped at
  // MAX_VENUE_IMAGES in lib/venues.ts to stay well under Firestore's 1MB
  // document limit. Unlike profile photos these aren't encrypted — venue
  // photos aren't personal data.
  images: string[]
  createdAt: Timestamp
  // Retired venues are kept (not deleted) so past auctions that referenced
  // them still resolve, but they're hidden from pickers going forward.
  retired?: boolean
  retiredAt?: Timestamp | null
}
