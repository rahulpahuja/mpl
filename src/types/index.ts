import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'auctionManager' | 'manager' | 'viewer'

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
