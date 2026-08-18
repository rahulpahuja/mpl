import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'auctionManager' | 'manager' | 'player' | 'viewer'

export type Handedness = 'left' | 'right'

export type PlayingRole =
  | 'batsman'
  | 'bowler'
  | 'battingAllRounder'
  | 'bowlingAllRounder'
  | 'wicketKeeperBatsman'

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

export type BattingType =
  | 'aggressiveBatsman'
  | 'defensiveBatsman'
  | 'anchorBatsman'
  | 'powerHitter'
  | 'allRoundStrokePlayer'
  | 'finisher'
  | 'technicallySoundBatsman'
  | 'unorthodoxBatsman'

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
  battingType?: BattingType
  bowlingType?: BowlingType
  playerRequested?: boolean
  // Short code assigned once at onboarding (see ensureUserDoc in lib/auth.ts).
  // Lets an Admin add someone as a team manager by ID instead of searching by
  // name/email/phone. Optional because users created before this field existed
  // won't have one until the backfill script runs.
  userCode?: string
  // Id of the uploaded profile photo on Filen storage (see server/ and
  // lib/filen.ts) — the current upload mechanism. Mutually exclusive with
  // avatarId, see lib/users.ts.
  filenPhotoId?: string | null
  // AES-GCM ciphertext (IV + payload, base64-encoded) of a compressed photo
  // data URL — see lib/crypto.ts and lib/imageProcessing.ts. Legacy: photos
  // uploaded before the Filen migration. No longer written by new uploads,
  // but still read/rendered as a fallback so existing photos don't go blank
  // until someone re-uploads (which sets filenPhotoId and clears this).
  encryptedPhoto?: string | null
  // Preset avatar id (see lib/avatars.ts), for users who'd rather pick one of
  // these than upload their own photo. Mutually exclusive with
  // filenPhotoId/encryptedPhoto — setting one clears the others, see lib/users.ts.
  avatarId?: string | null
  // Shirt number a player wears, picked from their own profile. No uniqueness
  // constraint across a team — teams reconcile clashes themselves.
  jerseyNumber?: number | null
  // An Admin/Auction Manager proposing a replacement profile photo on this
  // user's behalf (see requestProfilePhotoChange in lib/users.ts) — never
  // applied to filenPhotoId directly, only once the user themselves approves
  // it (real-time via the same onSnapshot listener that already powers
  // useAuthStore, see AuthProvider.tsx). One at a time: a new request can't
  // be sent while this is still 'pending'. Cleared back to null by whichever
  // admin/manager sent it, once they've seen the resolved outcome.
  pendingPhotoRequest?: PendingPhotoRequest | null
}

export type PhotoRequestStatus = 'pending' | 'approved' | 'rejected'

export interface PendingPhotoRequest {
  // Id of the candidate photo, already uploaded to Filen (see lib/filen.ts)
  // by the requester before this doc is written — lets the target preview it
  // immediately via useFilenPhoto without the requester needing write access
  // to apply it themselves.
  filenPhotoId: string
  requestedBy: string
  requestedByName: string
  requestedAt: Timestamp
  status: PhotoRequestStatus
  resolvedAt?: Timestamp | null
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
  // True once this player has gone through the "unsold" state and was later
  // force-assigned to a team via assignUnsoldPlayer (rather than won by a
  // live bid) — see lib/auctions.ts. Drives the "reassigned" marker on the
  // Results page.
  wasUnsoldAssigned?: boolean
  // Snapshot of the linked user's photo, copied in when added via "Add
  // Registered Player" — same staleness tradeoff as `name` (see renamePlayer's
  // doc comment) and null for manually typed/CSV-imported players, who have
  // no linked account. Lets the auction doc (publicly readable) show a photo
  // without every viewer needing permission to read the users collection.
  encryptedPhoto?: string | null
  avatarId?: string | null
  photoURL?: string | null
  // When the linked user's current photo lives in Filen (see AppUser's
  // filenPhotoId), `encryptedPhoto` above holds a re-encrypted copy — Filen
  // downloads require Firebase auth, which an anonymous viewer on the public
  // auction feed doesn't have, so the public snapshot has to stay in the
  // legacy publicly-readable format regardless of where the source photo
  // lives. This field records *which* filenPhotoId that copy came from, so
  // the resync check can compare ids (cheap, stable) instead of the
  // encrypted bytes themselves — those get a fresh random IV every time
  // they're re-encrypted (see lib/crypto.ts), so comparing them directly
  // would never match and cause an infinite resync loop.
  photoSourceFilenId?: string | null
  // Same snapshot-at-add-time tradeoff as the photo fields above — the rest
  // of the cricket profile for the "who's on the block" spotlight.
  battingHandedness?: Handedness | null
  bowlingHandedness?: Handedness | null
  battingType?: BattingType | null
  bowlingType?: BowlingType | null
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
  // Colors for the auction name heading and the supporting line under it
  // (status/auction ID/sold count) on every page that shows this auction —
  // setup, live bidding, viewer, and results.
  titleColor?: string | null
  secondaryColor?: string | null
  // Path of a sample ground photo (see lib/backgroundImages.ts) picked as
  // this auction's page backdrop. Null/absent falls back to the plain
  // bgColor backdrop instead — see components/AuctionBackground.tsx.
  backgroundImage?: string | null
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
  // Mirrors Player.wasUnsoldAssigned — set when this player was force-assigned
  // to the team after going unsold, rather than won by a live bid.
  wasUnsoldAssigned?: boolean
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
