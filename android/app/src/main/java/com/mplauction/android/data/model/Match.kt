package com.mplauction.android.data.model

import com.google.firebase.Timestamp

// matches/{matchId} — mirrors Match in src/types/index.ts. Model only in
// this pass; the live scorer/viewer UI and lib/matches.ts-equivalent
// repository are a later slice (requirements.md "Host a match").
data class Match(
  val matchId: String = "",
  val name: String = "",
  val format: MatchFormat = MatchFormat.friendly,
  val tournamentId: String? = null,
  val tournamentName: String? = null,
  val dayNight: DayNight = DayNight.day,
  val ballType: BallType = BallType.tennis,
  val groundType: GroundType = GroundType.ground,
  val oversLimit: Long = 0,
  val venueId: String? = null,
  val venueName: String? = null,
  val status: MatchStatus = MatchStatus.setup,
  val createdBy: String = "",
  val createdAt: Timestamp? = null,
  val scheduledAt: Timestamp? = null,
  val teamA: MatchTeamSide = MatchTeamSide(),
  val teamB: MatchTeamSide = MatchTeamSide(),
  val toss: Toss? = null,
  val currentInnings: Long = 1,
  val innings1: InningsState? = null,
  val innings2: InningsState? = null,
  val result: String? = null,
  val winnerTeamId: String? = null,
  val scorerIds: List<String> = emptyList(),
  val lastBall: LastBall? = null,
  val undoSnapshot: UndoSnapshot? = null,
)

data class MatchTeamSide(
  val teamId: String = "",
  val teamName: String = "",
  val logoId: String? = null,
  val logoImage: String? = null,
  val jerseyColor: String? = null,
  val playingXI: List<String> = emptyList(),
  val captainId: String? = null,
  val wicketKeeperId: String? = null,
)

data class Toss(
  val wonByTeamId: String = "",
  val decision: TossDecision = TossDecision.bat,
)

data class DismissalInfo(
  val type: WicketType = WicketType.bowled,
  val bowlerId: String? = null,
  val bowlerName: String? = null,
  val fielderId: String? = null,
  val fielderName: String? = null,
)

data class BatsmanInningsStat(
  val playerId: String = "",
  val name: String = "",
  val battingOrder: Long = 0,
  val runs: Long = 0,
  val balls: Long = 0,
  val fours: Long = 0,
  val sixes: Long = 0,
  val isOut: Boolean = false,
  val dismissal: DismissalInfo? = null,
)

data class BowlerInningsStat(
  val playerId: String = "",
  val name: String = "",
  val legalBalls: Long = 0,
  val runsConceded: Long = 0,
  val wickets: Long = 0,
  val maidens: Long = 0,
  val fours: Long = 0,
  val sixes: Long = 0,
)

data class CurrentOverBall(
  val runs: Long = 0,
  val extraType: ExtraType? = null,
  val isWicket: Boolean = false,
)

data class FallOfWicket(
  val wicket: Long = 0,
  val runs: Long = 0,
  val playerId: String = "",
  val playerName: String = "",
  val overSummary: String = "",
)

data class InningsExtras(
  val wides: Long = 0,
  val noBalls: Long = 0,
  val byes: Long = 0,
  val legByes: Long = 0,
  val penalty: Long = 0,
)

data class InningsState(
  val inningsNumber: Long = 1,
  val battingTeamId: String = "",
  val bowlingTeamId: String = "",
  val totalRuns: Long = 0,
  val wickets: Long = 0,
  val legalBallsBowled: Long = 0,
  val currentOverBalls: List<CurrentOverBall> = emptyList(),
  val strikerId: String? = null,
  val nonStrikerId: String? = null,
  val currentBowlerId: String? = null,
  val lastOverBowlerId: String? = null,
  val isFreeHit: Boolean = false,
  val battingStats: Map<String, BatsmanInningsStat> = emptyMap(),
  val bowlingStats: Map<String, BowlerInningsStat> = emptyMap(),
  val fallOfWickets: List<FallOfWicket> = emptyList(),
  val extras: InningsExtras = InningsExtras(),
  val target: Long? = null,
  val completedReason: String? = null,
)

data class LastBall(
  val runs: Long = 0,
  val extraType: ExtraType? = null,
  val isWicket: Boolean = false,
  val isBoundary: Long? = null,
  val ballSeq: Long = 0,
)

data class UndoSnapshot(
  val key: String = "innings1",
  val innings: InningsState? = null,
  val status: MatchStatus = MatchStatus.live,
  val ballDocPath: String = "",
)

// matches/{matchId}/balls/{autoId} — mirrors BallOutcome, the ball-by-ball
// audit/undo log.
data class BallOutcome(
  val inningsNumber: Long = 1,
  val overNumber: Long = 0,
  val ballInOver: Long = 0,
  val bowlerId: String = "",
  val strikerId: String = "",
  val nonStrikerId: String = "",
  val runs: Long = 0,
  val extraType: ExtraType? = null,
  val extraRuns: Long = 0,
  val isWicket: Boolean = false,
  val wicketType: WicketType? = null,
  val dismissedPlayerId: String? = null,
  val fielderId: String? = null,
  val isFreeHit: Boolean = false,
  val scoredBy: String = "",
  val timestamp: Timestamp? = null,
)

// playerStats/{playerId} — career numbers, mirrors PlayerStats. Aggregated
// server/repository-side off completed matches; nobody writes this by hand.
data class PlayerStats(
  val playerId: String = "",
  val matchesPlayed: Long = 0,
  val batting: BattingCareerStats = BattingCareerStats(),
  val bowling: BowlingCareerStats = BowlingCareerStats(),
  val fielding: FieldingCareerStats = FieldingCareerStats(),
  val wicketKeeping: WicketKeepingCareerStats = WicketKeepingCareerStats(),
  val updatedAt: Timestamp? = null,
)

data class BattingCareerStats(
  val innings: Long = 0,
  val runs: Long = 0,
  val balls: Long = 0,
  val fours: Long = 0,
  val sixes: Long = 0,
  val notOuts: Long = 0,
  val highScore: Long = 0,
  val twentyFives: Long = 0,
  val fifties: Long = 0,
  val hundreds: Long = 0,
  val twoHundreds: Long = 0,
  val threeHundreds: Long = 0,
  val fourHundreds: Long = 0,
)

data class BowlingCareerStats(
  val innings: Long = 0,
  val legalBalls: Long = 0,
  val runsConceded: Long = 0,
  val wickets: Long = 0,
  val maidens: Long = 0,
  val fours: Long = 0,
  val sixes: Long = 0,
  val bestWickets: Long = 0,
  val bestRuns: Long = 0,
  val threeWicketHauls: Long = 0,
  val fiveWicketHauls: Long = 0,
  val sevenWicketHauls: Long = 0,
  val tenWicketHauls: Long = 0,
)

data class FieldingCareerStats(
  val catches: Long = 0,
  val runOuts: Long = 0,
  val stumpings: Long = 0,
)

data class WicketKeepingCareerStats(
  val dismissals: Long = 0,
  val stumpings: Long = 0,
  val catchesAsKeeper: Long = 0,
)
