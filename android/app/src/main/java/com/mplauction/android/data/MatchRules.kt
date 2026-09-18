package com.mplauction.android.data

import com.mplauction.android.data.model.BallOutcome
import com.mplauction.android.data.model.BatsmanInningsStat
import com.mplauction.android.data.model.BowlerInningsStat
import com.mplauction.android.data.model.CoinToss
import com.mplauction.android.data.model.CurrentOverBall
import com.mplauction.android.data.model.DismissalInfo
import com.mplauction.android.data.model.ExtraType
import com.mplauction.android.data.model.FallOfWicket
import com.mplauction.android.data.model.InningsState
import com.mplauction.android.data.model.MatchTeamSide
import com.mplauction.android.data.model.WicketType

// Port of src/lib/matchRules.ts — pure, side-effect-free cricket scoring
// engine. Every rule for turning one ball into an updated innings lives
// here, free of Firestore, so MatchRepository's transaction can call it
// deterministically and it stays straightforward to unit test in isolation.

data class ScoreBallInput(
  // Runs to credit for this delivery — meaning depends on extraType:
  // normal/noBall: runs off the bat. bye/legBye: runs run (the extra
  // itself). wide: *additional* runs run on top of the automatic 1.
  val runs: Long,
  val extraType: ExtraType?,
  val isWicket: Boolean,
  val wicketType: WicketType? = null,
  // Defaults to the striker. Only meaningful (and only ever differs from the
  // striker) for a run-out of the non-striker.
  val dismissedPlayerId: String? = null,
  val fielderId: String? = null,
  val fielderName: String? = null,
  val scoredBy: String,
)

data class RecordBallResult(
  val innings: InningsState,
  val ball: BallOutcome,
  val overCompleted: Boolean,
  val inningsCompleted: Boolean,
)

private val NON_RUN_OUT_DISMISSAL_BLOCKED_ON = setOf(ExtraType.wide, ExtraType.noBall)
private val BAT_DISMISSALS = setOf(WicketType.bowled, WicketType.caught, WicketType.lbw)

object MatchRules {
  fun startInnings(battingTeamId: String, bowlingTeamId: String, inningsNumber: Long, target: Long? = null): InningsState =
    InningsState(inningsNumber = inningsNumber, battingTeamId = battingTeamId, bowlingTeamId = bowlingTeamId, target = target)

  // A side is all out once only one batter is left — 10 for a full XI, but
  // a Team Draft side can be any size, so this must come from the roster.
  // Falls back to 10 when the roster isn't recorded.
  fun maxWickets(side: MatchTeamSide): Long = if (side.playingXI.isEmpty()) 10 else (side.playingXI.size - 1).coerceAtLeast(1).toLong()

  // The calling side wins a correct call; otherwise the other side does.
  fun coinTossWinner(teamA: MatchTeamSide, teamB: MatchTeamSide, toss: CoinToss): String =
    when {
      toss.call == toss.outcome -> toss.callerTeamId
      toss.callerTeamId == teamA.teamId -> teamB.teamId
      else -> teamA.teamId
    }

  fun formatOvers(legalBalls: Long): String = "${legalBalls / 6}.${legalBalls % 6}"

  fun netRunRate(runsFor: Long, oversFor: Double, runsAgainst: Long, oversAgainst: Double): Double {
    if (oversFor <= 0 || oversAgainst <= 0) return 0.0
    return runsFor / oversFor - runsAgainst / oversAgainst
  }

  fun assertCanRecordBall(innings: InningsState) {
    if (innings.completedReason != null) throw IllegalStateException("This innings has already finished")
    if (innings.strikerId == null || innings.nonStrikerId == null) {
      throw IllegalStateException("Pick the next batsman before recording another ball")
    }
    if (innings.currentBowlerId == null) {
      throw IllegalStateException("Pick the next over's bowler before recording another ball")
    }
  }

  fun setNextBatsman(innings: InningsState, playerId: String, name: String): InningsState {
    if (innings.battingStats.containsKey(playerId)) {
      throw IllegalStateException("$name has already batted this innings")
    }
    var strikerId = innings.strikerId
    var nonStrikerId = innings.nonStrikerId
    when {
      strikerId == null -> strikerId = playerId
      nonStrikerId == null -> nonStrikerId = playerId
      else -> throw IllegalStateException("Both batting slots are already filled")
    }
    val battingOrder = innings.battingStats.size.toLong() + 1
    val entry = BatsmanInningsStat(playerId = playerId, name = name, battingOrder = battingOrder)
    return innings.copy(strikerId = strikerId, nonStrikerId = nonStrikerId, battingStats = innings.battingStats + (playerId to entry))
  }

  fun setNextBowler(innings: InningsState, playerId: String, name: String): InningsState {
    if (innings.currentBowlerId != null) throw IllegalStateException("A bowler is already set for this over")
    if (playerId == innings.lastOverBowlerId) throw IllegalStateException("The same bowler cannot bowl two overs in a row")
    val entry = innings.bowlingStats[playerId] ?: BowlerInningsStat(playerId = playerId, name = name)
    return innings.copy(currentBowlerId = playerId, bowlingStats = innings.bowlingStats + (playerId to entry))
  }

  fun recordBall(innings: InningsState, oversLimit: Long, maxWickets: Long, input: ScoreBallInput): RecordBallResult {
    assertCanRecordBall(innings)
    if (input.runs < 0) throw IllegalArgumentException("Runs cannot be negative")

    val extraType = input.extraType
    val isLegalBall = extraType != ExtraType.wide && extraType != ExtraType.noBall
    val freeHitActive = innings.isFreeHit

    if (input.isWicket) {
      val type = input.wicketType ?: throw IllegalArgumentException("Wicket type is required")
      if (freeHitActive || (extraType != null && extraType in NON_RUN_OUT_DISMISSAL_BLOCKED_ON)) {
        if (type != WicketType.runOut) throw IllegalStateException("Only a run out is possible on a wide/no-ball or free hit")
      } else if ((extraType == ExtraType.bye || extraType == ExtraType.legBye) && type in BAT_DISMISSALS) {
        throw IllegalStateException("$type is not possible off a bye/leg bye")
      }
    }

    // Runs charged against the bowler's figures and runs added to the team
    // total both depend on the extra type — byes/leg byes aren't charged to
    // the bowler even though they count for the team.
    val teamRuns: Long
    val bowlerRunsCharged: Long
    var batRunsCredited = 0L
    var rotationRuns = input.runs
    when (extraType) {
      ExtraType.wide -> {
        teamRuns = 1 + input.runs
        bowlerRunsCharged = teamRuns
      }
      ExtraType.noBall -> {
        teamRuns = 1 + input.runs
        bowlerRunsCharged = teamRuns
        batRunsCredited = input.runs
      }
      ExtraType.bye, ExtraType.legBye -> {
        teamRuns = input.runs
        bowlerRunsCharged = 0
      }
      ExtraType.penalty -> {
        teamRuns = input.runs
        bowlerRunsCharged = 0
        rotationRuns = 0
      }
      null -> {
        teamRuns = input.runs
        bowlerRunsCharged = input.runs
        batRunsCredited = input.runs
      }
    }

    val onStrikeAtStart = innings.strikerId!!
    val nonStrikerAtStart = innings.nonStrikerId!!
    val bowlerId = innings.currentBowlerId!!

    val legalBallsBowled = innings.legalBallsBowled + if (isLegalBall) 1 else 0
    val willCompleteOver = isLegalBall && legalBallsBowled % 6 == 0L
    val wickets = innings.wickets + if (input.isWicket) 1 else 0
    val totalRuns = innings.totalRuns + teamRuns

    var strikerId: String? = onStrikeAtStart
    var nonStrikerId: String? = nonStrikerAtStart
    if (rotationRuns % 2 == 1L) {
      val t = strikerId
      strikerId = nonStrikerId
      nonStrikerId = t
    }
    if (willCompleteOver) {
      val t = strikerId
      strikerId = nonStrikerId
      nonStrikerId = t
    }

    val dismissedId = if (input.isWicket) (input.dismissedPlayerId ?: onStrikeAtStart) else null
    if (dismissedId != null) {
      when (dismissedId) {
        strikerId -> strikerId = null
        nonStrikerId -> nonStrikerId = null
        else -> throw IllegalStateException("Dismissed player is not currently batting")
      }
    }

    val allOut = wickets >= maxWickets
    val oversComplete = legalBallsBowled >= oversLimit * 6
    val targetReached = innings.target != null && totalRuns >= innings.target
    val inningsCompleted = allOut || oversComplete || targetReached
    val completedReason = when {
      allOut -> "allOut"
      oversComplete -> "oversComplete"
      targetReached -> "targetReached"
      else -> null
    }

    val bowlerNameForDismissal = innings.bowlingStats.getValue(bowlerId).name
    fun dismissalForBatsman() = DismissalInfo(
      type = input.wicketType!!,
      bowlerId = if (input.wicketType == WicketType.runOut) null else bowlerId,
      bowlerName = if (input.wicketType == WicketType.runOut) null else bowlerNameForDismissal,
      fielderId = input.fielderId,
      fielderName = input.fielderName,
    )

    val battingStats = innings.battingStats.toMutableMap()
    val strikerEntry = battingStats.getValue(onStrikeAtStart)
    battingStats[onStrikeAtStart] = strikerEntry.copy(
      runs = strikerEntry.runs + batRunsCredited,
      balls = strikerEntry.balls + if (isLegalBall) 1 else 0,
      fours = strikerEntry.fours + if (batRunsCredited == 4L) 1 else 0,
      sixes = strikerEntry.sixes + if (batRunsCredited == 6L) 1 else 0,
      isOut = if (dismissedId == onStrikeAtStart) true else strikerEntry.isOut,
      dismissal = if (dismissedId == onStrikeAtStart) dismissalForBatsman() else strikerEntry.dismissal,
    )
    if (dismissedId == nonStrikerAtStart) {
      val nonStrikerEntry = battingStats.getValue(nonStrikerAtStart)
      battingStats[nonStrikerAtStart] = nonStrikerEntry.copy(isOut = true, dismissal = dismissalForBatsman())
    }

    val bowlingStats = innings.bowlingStats.toMutableMap()
    val bowlerEntry = bowlingStats.getValue(bowlerId)
    val overRunsSoFar = innings.currentOverBalls.sumOf { it.runs } + teamRuns
    bowlingStats[bowlerId] = bowlerEntry.copy(
      legalBalls = bowlerEntry.legalBalls + if (isLegalBall) 1 else 0,
      runsConceded = bowlerEntry.runsConceded + bowlerRunsCharged,
      wickets = bowlerEntry.wickets + if (input.isWicket && input.wicketType != WicketType.runOut) 1 else 0,
      maidens = bowlerEntry.maidens + if (willCompleteOver && overRunsSoFar == 0L) 1 else 0,
      fours = bowlerEntry.fours + if (batRunsCredited == 4L) 1 else 0,
      sixes = bowlerEntry.sixes + if (batRunsCredited == 6L) 1 else 0,
      wides = bowlerEntry.wides + if (extraType == ExtraType.wide) 1 else 0,
      noBalls = bowlerEntry.noBalls + if (extraType == ExtraType.noBall) 1 else 0,
    )

    val fallOfWickets =
      if (input.isWicket) {
        innings.fallOfWickets +
          FallOfWicket(
            wicket = wickets,
            runs = totalRuns,
            playerId = dismissedId!!,
            playerName = battingStats.getValue(dismissedId).name,
            overSummary = formatOvers(legalBallsBowled),
          )
      } else {
        innings.fallOfWickets
      }

    val currentOverBalls =
      if (willCompleteOver) emptyList()
      else innings.currentOverBalls + CurrentOverBall(runs = teamRuns, extraType = extraType, isWicket = input.isWicket)

    val extras =
      when (extraType) {
        ExtraType.wide -> innings.extras.copy(wides = innings.extras.wides + teamRuns)
        ExtraType.noBall -> innings.extras.copy(noBalls = innings.extras.noBalls + 1)
        ExtraType.bye -> innings.extras.copy(byes = innings.extras.byes + teamRuns)
        ExtraType.legBye -> innings.extras.copy(legByes = innings.extras.legByes + teamRuns)
        ExtraType.penalty -> innings.extras.copy(penalty = innings.extras.penalty + teamRuns)
        null -> innings.extras
      }

    val updated =
      innings.copy(
        totalRuns = totalRuns,
        wickets = wickets,
        legalBallsBowled = legalBallsBowled,
        currentOverBalls = currentOverBalls,
        strikerId = if (inningsCompleted) innings.strikerId else strikerId,
        nonStrikerId = if (inningsCompleted) innings.nonStrikerId else nonStrikerId,
        currentBowlerId = if (inningsCompleted) bowlerId else if (willCompleteOver) null else bowlerId,
        lastOverBowlerId = if (willCompleteOver) bowlerId else innings.lastOverBowlerId,
        isFreeHit = if (extraType == ExtraType.noBall) true else if (isLegalBall) false else innings.isFreeHit,
        battingStats = battingStats,
        bowlingStats = bowlingStats,
        fallOfWickets = fallOfWickets,
        extras = extras,
        completedReason = completedReason,
      )

    val ball =
      BallOutcome(
        inningsNumber = innings.inningsNumber,
        overNumber = innings.legalBallsBowled / 6,
        ballInOver = innings.legalBallsBowled % 6 + 1,
        bowlerId = bowlerId,
        strikerId = onStrikeAtStart,
        nonStrikerId = nonStrikerAtStart,
        runs = batRunsCredited,
        extraType = extraType,
        extraRuns = teamRuns - batRunsCredited,
        isWicket = input.isWicket,
        wicketType = if (input.isWicket) input.wicketType else null,
        dismissedPlayerId = dismissedId,
        fielderId = input.fielderId,
        isFreeHit = freeHitActive,
        scoredBy = input.scoredBy,
      )

    return RecordBallResult(updated, ball, willCompleteOver, inningsCompleted)
  }

  // Returns the result string and the winning team's id (null for a tie or
  // an unfinished match).
  fun computeMatchResult(teamA: MatchTeamSide, teamB: MatchTeamSide, innings1: InningsState?, innings2: InningsState?): Pair<String, String?> {
    if (innings1 == null || innings2 == null || innings1.completedReason == null || innings2.completedReason == null) {
      return "" to null
    }
    val team1 = if (teamA.teamId == innings1.battingTeamId) teamA else teamB
    val team2 = if (teamA.teamId == innings2.battingTeamId) teamA else teamB
    if (innings2.totalRuns > innings1.totalRuns) {
      val wicketsInHand = maxWickets(team2) - innings2.wickets
      return "${team2.teamName} won by $wicketsInHand wicket${if (wicketsInHand == 1L) "" else "s"}" to team2.teamId
    }
    if (innings1.totalRuns > innings2.totalRuns) {
      val margin = innings1.totalRuns - innings2.totalRuns
      return "${team1.teamName} won by $margin run${if (margin == 1L) "" else "s"}" to team1.teamId
    }
    return "Match tied" to null
  }
}
