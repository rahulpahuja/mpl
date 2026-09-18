package com.mplauction.android.data

import com.mplauction.android.data.model.CoinSide
import com.mplauction.android.data.model.CoinToss
import com.mplauction.android.data.model.ExtraType
import com.mplauction.android.data.model.InningsState
import com.mplauction.android.data.model.MatchTeamSide
import com.mplauction.android.data.model.WicketType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

// Mirrors src/lib/matchRules.test.ts so the Kotlin port is held to the same cases.
class MatchRulesTest {
  private val scoredBy = "scorer-1"

  private fun readyInnings(target: Long? = null): InningsState {
    var innings = MatchRules.startInnings("teamA", "teamB", if (target != null) 2 else 1, target)
    innings = MatchRules.setNextBatsman(innings, "bat1", "Rohit")
    innings = MatchRules.setNextBatsman(innings, "bat2", "Kohli")
    return MatchRules.setNextBowler(innings, "bowl1", "Bumrah")
  }

  private fun ball(runs: Long, extraType: ExtraType? = null, wicketType: WicketType? = null, dismissed: String? = null) =
    ScoreBallInput(runs = runs, extraType = extraType, isWicket = wicketType != null, wicketType = wicketType, dismissedPlayerId = dismissed, scoredBy = scoredBy)

  private fun bowl(innings: InningsState, runs: List<Long>, oversLimit: Long = 20): InningsState =
    runs.fold(innings) { acc, r -> MatchRules.recordBall(acc, oversLimit, 10, ball(r)).innings }

  @Test fun fillsStrikerThenNonStrikerAndRejectsThird() {
    var innings = MatchRules.startInnings("teamA", "teamB", 1)
    innings = MatchRules.setNextBatsman(innings, "bat1", "Rohit")
    assertEquals("bat1", innings.strikerId)
    innings = MatchRules.setNextBatsman(innings, "bat2", "Kohli")
    assertEquals("bat2", innings.nonStrikerId)
    assertThrows(IllegalStateException::class.java) { MatchRules.setNextBatsman(innings, "bat3", "Rahul") }
  }

  @Test fun rejectsSameBowlerConsecutiveOvers() {
    var innings = bowl(readyInnings(), listOf(0, 0, 0, 0, 0, 0))
    assertNull(innings.currentBowlerId)
    assertThrows(IllegalStateException::class.java) { MatchRules.setNextBowler(innings, "bowl1", "Bumrah") }
    innings = MatchRules.setNextBowler(innings, "bowl2", "Shami")
    assertEquals("bowl2", innings.currentBowlerId)
  }

  @Test fun rotatesStrikeOnOddRunsAndCompletesOver() {
    var innings = MatchRules.recordBall(readyInnings(), 20, 10, ball(1)).innings
    assertEquals("bat2", innings.strikerId)
    innings = bowl(innings, listOf(0, 0, 0, 0, 0))
    assertEquals(6L, innings.legalBallsBowled)
    assertNull(innings.currentBowlerId)
    assertEquals("bowl1", innings.lastOverBowlerId)
  }

  @Test fun creditsBoundaryToStriker() {
    val innings = MatchRules.recordBall(readyInnings(), 20, 10, ball(4)).innings
    assertEquals(4L, innings.battingStats.getValue("bat1").runs)
    assertEquals(1L, innings.battingStats.getValue("bat1").fours)
    assertEquals(1L, innings.battingStats.getValue("bat1").balls)
    assertEquals(4L, innings.totalRuns)
    assertEquals(4L, innings.bowlingStats.getValue("bowl1").runsConceded)
  }

  @Test fun wideAddsRunWithoutConsumingBall() {
    val result = MatchRules.recordBall(readyInnings(), 20, 10, ball(0, ExtraType.wide))
    assertEquals(1L, result.innings.totalRuns)
    assertEquals(1L, result.innings.extras.wides)
    assertEquals(0L, result.innings.legalBallsBowled)
    assertFalse(result.overCompleted)
  }

  @Test fun rejectsBowledOnWideButAllowsRunOut() {
    assertThrows(IllegalStateException::class.java) {
      MatchRules.recordBall(readyInnings(), 20, 10, ball(0, ExtraType.wide, WicketType.bowled))
    }
    val after = MatchRules.recordBall(readyInnings(), 20, 10, ball(0, ExtraType.wide, WicketType.runOut, "bat1")).innings
    assertEquals(1L, after.wickets)
    assertNull(after.strikerId)
  }

  @Test fun noBallSetsFreeHitAndCreditsBatRuns() {
    val innings = MatchRules.recordBall(readyInnings(), 20, 10, ball(6, ExtraType.noBall)).innings
    assertEquals(7L, innings.totalRuns)
    assertEquals(1L, innings.extras.noBalls)
    assertEquals(0L, innings.legalBallsBowled)
    assertTrue(innings.isFreeHit)
    assertEquals(1L, innings.battingStats.getValue("bat1").sixes)
    assertEquals(1L, innings.bowlingStats.getValue("bowl1").sixes)
  }

  @Test fun freeHitBlocksCaughtAndClearsAfterLegalBall() {
    var innings = MatchRules.recordBall(readyInnings(), 20, 10, ball(0, ExtraType.noBall)).innings
    val freeHit = innings
    assertThrows(IllegalStateException::class.java) { MatchRules.recordBall(freeHit, 20, 10, ball(0, null, WicketType.caught)) }
    innings = MatchRules.recordBall(innings, 20, 10, ball(1)).innings
    assertFalse(innings.isFreeHit)
  }

  @Test fun byesAreLegalButCreditNoBatRuns() {
    val innings = MatchRules.recordBall(readyInnings(), 20, 10, ball(2, ExtraType.bye)).innings
    assertEquals(2L, innings.totalRuns)
    assertEquals(2L, innings.extras.byes)
    assertEquals(1L, innings.legalBallsBowled)
    assertEquals(0L, innings.battingStats.getValue("bat1").runs)
    assertEquals(1L, innings.battingStats.getValue("bat1").balls)
    assertEquals(0L, innings.bowlingStats.getValue("bowl1").runsConceded)
    assertThrows(IllegalStateException::class.java) {
      MatchRules.recordBall(readyInnings(), 20, 10, ball(1, ExtraType.bye, WicketType.bowled))
    }
  }

  @Test fun wicketBlocksUntilNewBatsman() {
    var innings = MatchRules.recordBall(readyInnings(), 20, 10, ball(0, null, WicketType.bowled)).innings
    assertEquals(1L, innings.wickets)
    assertNull(innings.strikerId)
    assertTrue(innings.battingStats.getValue("bat1").isOut)
    assertThrows(IllegalStateException::class.java) { MatchRules.assertCanRecordBall(innings) }
    innings = MatchRules.setNextBatsman(innings, "bat3", "Rahul")
    assertEquals("bat3", innings.strikerId)
    MatchRules.assertCanRecordBall(innings)
  }

  @Test fun endsAllOutOnMaxWickets() {
    var innings = readyInnings()
    var next = 3
    repeat(10) {
      val result = MatchRules.recordBall(innings, 20, 10, ball(0, null, WicketType.bowled))
      innings = result.innings
      if (result.inningsCompleted) return@repeat
      innings = MatchRules.setNextBatsman(innings, "bat$next", "Player $next")
      next++
      if (result.overCompleted) innings = MatchRules.setNextBowler(innings, "bowl-relief-$next", "Reliever")
    }
    assertEquals(10L, innings.wickets)
    assertEquals("allOut", innings.completedReason)
  }

  @Test fun endsWhenOversLimitReached() {
    var innings = bowl(readyInnings(), listOf(0, 0, 0, 0, 0, 0), 2)
    assertNull(innings.completedReason)
    innings = MatchRules.setNextBowler(innings, "bowl2", "Shami")
    innings = bowl(innings, listOf(0, 0, 0, 0, 0, 0), 2)
    assertEquals(12L, innings.legalBallsBowled)
    assertEquals("oversComplete", innings.completedReason)
  }

  @Test fun endsWhenTargetReached() {
    val first = MatchRules.recordBall(readyInnings(10), 20, 10, ball(6))
    assertFalse(first.inningsCompleted)
    val final = MatchRules.recordBall(first.innings, 20, 10, ball(6))
    assertTrue(final.inningsCompleted)
    assertEquals("targetReached", final.innings.completedReason)
    assertEquals(12L, final.innings.totalRuns)
  }

  @Test fun maidenCreditedOnDotOver() {
    val innings = bowl(readyInnings(), listOf(0, 0, 0, 0, 0, 0))
    assertEquals(1L, innings.bowlingStats.getValue("bowl1").maidens)
  }

  @Test fun bowlerCountsWideAndNoBallDeliveries() {
    var innings = MatchRules.recordBall(readyInnings(), 20, 10, ball(2, ExtraType.wide)).innings
    innings = MatchRules.recordBall(innings, 20, 10, ball(0, ExtraType.noBall)).innings
    innings = MatchRules.recordBall(innings, 20, 10, ball(1, ExtraType.bye)).innings
    val bowler = innings.bowlingStats.getValue("bowl1")
    assertEquals(1L, bowler.wides)
    assertEquals(1L, bowler.noBalls)
    assertEquals(3L, innings.extras.wides) // runs, unlike the per-bowler delivery count
  }

  @Test fun coinTossWinnerFollowsTheCall() {
    val teamA = MatchTeamSide(teamId = "teamA")
    val teamB = MatchTeamSide(teamId = "teamB")
    assertEquals("teamB", MatchRules.coinTossWinner(teamA, teamB, CoinToss(callerTeamId = "teamB", call = CoinSide.heads, outcome = CoinSide.heads)))
    assertEquals("teamA", MatchRules.coinTossWinner(teamA, teamB, CoinToss(callerTeamId = "teamB", call = CoinSide.heads, outcome = CoinSide.tails)))
    assertEquals("teamB", MatchRules.coinTossWinner(teamA, teamB, CoinToss(callerTeamId = "teamA", call = CoinSide.tails, outcome = CoinSide.heads)))
  }

  @Test fun formatsOversAndNetRunRate() {
    assertEquals("0.0", MatchRules.formatOvers(0))
    assertEquals("0.5", MatchRules.formatOvers(5))
    assertEquals("1.0", MatchRules.formatOvers(6))
    assertEquals("2.1", MatchRules.formatOvers(13))
    assertEquals(1.0, MatchRules.netRunRate(160, 20.0, 140, 20.0), 1e-9)
    assertEquals(0.0, MatchRules.netRunRate(0, 0.0, 100, 20.0), 1e-9)
  }

  @Test fun chasingTeamWinsByWicketsInHand() {
    val teamA = MatchTeamSide(teamId = "teamA", teamName = "Mavericks")
    val teamB = MatchTeamSide(teamId = "teamB", teamName = "Titans")
    val innings1 = MatchRules.startInnings("teamA", "teamB", 1).copy(totalRuns = 150, completedReason = "oversComplete")
    val innings2 = MatchRules.startInnings("teamB", "teamA", 2, 151).copy(totalRuns = 151, wickets = 4, completedReason = "targetReached")
    val (result, winner) = MatchRules.computeMatchResult(teamA, teamB, innings1, innings2)
    assertEquals("teamB", winner)
    assertEquals("Titans won by 6 wickets", result)
  }
}
