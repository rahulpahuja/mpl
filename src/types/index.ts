import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'auctionManager' | 'manager' | 'player' | 'viewer'

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
}
