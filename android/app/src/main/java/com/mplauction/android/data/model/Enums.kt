package com.mplauction.android.data.model

// These enum constant names are the literal strings stored on Firestore docs
// (see src/types/index.ts in the web app) — Firestore's default POJO mapping
// matches a stored string to an enum constant by exact name, so the names
// here must stay byte-for-byte identical to the web app's string literals,
// not idiomatic Kotlin enum casing.

enum class UserRole {
  admin,
  auctionManager,
  manager,
  player,
  viewer,
}

enum class Handedness {
  left,
  right,
}

enum class PlayingRole {
  batsman,
  bowler,
  battingAllRounder,
  bowlingAllRounder,
  wicketKeeperBatsman,
}

enum class BowlingType {
  fastBowler,
  mediumFastSwingSeam,
  medium,
  fast,
  mediumFastAngleSwing,
  offSpin,
  legSpin,
  orthodoxSpin,
  chinaman,
  slowerBallSpecialist,
  swingBowler,
  seamBowler,
}

enum class BattingType {
  aggressiveBatsman,
  defensiveBatsman,
  anchorBatsman,
  powerHitter,
  allRoundStrokePlayer,
  finisher,
  technicallySoundBatsman,
  unorthodoxBatsman,
}

enum class PlayerStatus {
  open,
  active,
  sold,
  unsold,
}

enum class AuctionStatus {
  draft,
  live,
  completed,
}

enum class PhotoRequestStatus {
  pending,
  approved,
  rejected,
}

enum class MatchFormat {
  friendly,
  tournament,
}

enum class DayNight {
  day,
  night,
}

enum class BallType {
  tennis,
  leather,
}

enum class GroundType {
  ground,
  box,
  gully,
}

enum class MatchStatus {
  setup,
  toss,
  live,
  inningsBreak,
  completed,
  abandoned,
}

// Android-only (no web equivalent yet): the synced coin flip, Match.coinToss.
enum class CoinSide {
  heads,
  tails,
}

enum class TossDecision {
  bat,
  bowl,
}

enum class ExtraType {
  wide,
  noBall,
  bye,
  legBye,
  penalty,
}

enum class WicketType {
  bowled,
  caught,
  lbw,
  runOut,
  stumped,
  hitWicket,
  retired,
  other,
}
