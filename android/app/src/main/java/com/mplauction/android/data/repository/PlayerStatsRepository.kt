package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.mplauction.android.data.model.BatsmanInningsStat
import com.mplauction.android.data.model.BattingCareerStats
import com.mplauction.android.data.model.BowlerInningsStat
import com.mplauction.android.data.model.BowlingCareerStats
import com.mplauction.android.data.model.FieldingCareerStats
import com.mplauction.android.data.model.Match
import com.mplauction.android.data.model.PlayerStats
import com.mplauction.android.data.model.WicketKeepingCareerStats
import com.mplauction.android.data.model.WicketType
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.toObjectOrNull
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "PlayerStatsRepository"

// Port of src/lib/playerStats.ts — career numbers aggregated off every
// completed match's final scorecard, keyed by playerId in playerStats/{id}.
// Nobody writes these by hand (see firestore.rules); MatchRepository calls
// applyMatch once a match's status flips to completed.
class PlayerStatsRepository {
  private val db = Firebase.firestore

  private fun statsRef(playerId: String) = db.collection("playerStats").document(playerId)

  fun observePlayerStats(playerId: String): Flow<PlayerStats?> = callbackFlow {
    val registration =
      statsRef(playerId).addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "playerStats $playerId listener error", error)
          trySend(null)
          return@addSnapshotListener
        }
        trySend(snap?.toObjectOrNull<PlayerStats>())
      }
    awaitClose { registration.remove() }
  }

  private class Contribution {
    var batting: BatsmanInningsStat? = null
    var bowling: BowlerInningsStat? = null
    var catches: Long = 0
    var runOuts: Long = 0
    var stumpings: Long = 0
    var catchesAsKeeper: Long = 0
    var stumpingsAsKeeper: Long = 0
  }

  // Every playing XI member gets matchesPlayed credit; contributions (bat/
  // bowl/field) are folded in per player from both innings' final stats.
  suspend fun applyMatch(match: Match) {
    val playingXI = (match.teamA.playingXI + match.teamB.playingXI).toSet()
    val wicketKeeperIds = setOfNotNull(match.teamA.wicketKeeperId, match.teamB.wicketKeeperId)
    val contributions = mutableMapOf<String, Contribution>()
    fun get(id: String) = contributions.getOrPut(id) { Contribution() }

    for (innings in listOfNotNull(match.innings1, match.innings2)) {
      for (bat in innings.battingStats.values) {
        get(bat.playerId).batting = bat
        val fielderId = bat.dismissal?.fielderId
        if (bat.isOut && fielderId != null) {
          val fc = get(fielderId)
          val isKeeper = fielderId in wicketKeeperIds
          when (bat.dismissal.type) {
            WicketType.caught -> {
              fc.catches += 1
              if (isKeeper) fc.catchesAsKeeper += 1
            }
            WicketType.runOut -> fc.runOuts += 1
            WicketType.stumped -> {
              fc.stumpings += 1
              if (isKeeper) fc.stumpingsAsKeeper += 1
            }
            else -> Unit
          }
        }
      }
      for (bowl in innings.bowlingStats.values) {
        get(bowl.playerId).bowling = bowl
      }
    }

    // Only called for completed matches, so no winner means a tie.
    fun outcomeFor(playerId: String): Outcome? {
      val teamId =
        when (playerId) {
          in match.teamA.playingXI -> match.teamA.teamId
          in match.teamB.playingXI -> match.teamB.teamId
          else -> return null
        }
      return when (match.winnerTeamId) {
        null -> Outcome.TIE
        teamId -> Outcome.WIN
        else -> Outcome.LOSS
      }
    }

    val playerIds = playingXI + contributions.keys
    for (playerId in playerIds) {
      applyOnePlayer(match.matchId, playerId, outcomeFor(playerId), contributions[playerId])
    }
  }

  private enum class Outcome { WIN, LOSS, TIE }

  private fun BattingCareerStats.withBand(runs: Long): BattingCareerStats =
    when {
      runs >= 400 -> copy(fourHundreds = fourHundreds + 1)
      runs >= 300 -> copy(threeHundreds = threeHundreds + 1)
      runs >= 200 -> copy(twoHundreds = twoHundreds + 1)
      runs >= 100 -> copy(hundreds = hundreds + 1)
      runs >= 50 -> copy(fifties = fifties + 1)
      runs >= 25 -> copy(twentyFives = twentyFives + 1)
      else -> this
    }

  private fun BowlingCareerStats.withHaulBand(wickets: Long): BowlingCareerStats =
    when {
      wickets >= 10 -> copy(tenWicketHauls = tenWicketHauls + 1)
      wickets >= 7 -> copy(sevenWicketHauls = sevenWicketHauls + 1)
      wickets >= 5 -> copy(fiveWicketHauls = fiveWicketHauls + 1)
      wickets >= 3 -> copy(threeWicketHauls = threeWicketHauls + 1)
      else -> this
    }

  // outcome is null for someone who contributed (e.g. a substitute fielder)
  // without being in either playing XI — no matchesPlayed or result credit.
  private suspend fun applyOnePlayer(matchId: String, playerId: String, outcome: Outcome?, contribution: Contribution?) {
    db.runTransaction { tx ->
      val ref = statsRef(playerId)
      val current = tx.get(ref).toObjectOrNull<PlayerStats>() ?: PlayerStats(playerId = playerId)

      var batting = current.batting
      val bat = contribution?.batting
      if (bat != null) {
        batting =
          batting
            .copy(
              innings = batting.innings + 1,
              runs = batting.runs + bat.runs,
              balls = batting.balls + bat.balls,
              fours = batting.fours + bat.fours,
              sixes = batting.sixes + bat.sixes,
              notOuts = batting.notOuts + if (bat.isOut) 0 else 1,
              ducks = batting.ducks + if (bat.isOut && bat.runs == 0L) 1 else 0,
              highScore = maxOf(batting.highScore, bat.runs),
            )
            .withBand(bat.runs)
      }

      var bowling = current.bowling
      val bowl = contribution?.bowling
      if (bowl != null) {
        val newInnings = bowling.innings + 1
        val isBetter =
          bowl.wickets > bowling.bestWickets ||
            (bowl.wickets == bowling.bestWickets && bowl.runsConceded < bowling.bestRuns) ||
            newInnings == 1L
        bowling =
          bowling
            .copy(
              innings = newInnings,
              legalBalls = bowling.legalBalls + bowl.legalBalls,
              runsConceded = bowling.runsConceded + bowl.runsConceded,
              wickets = bowling.wickets + bowl.wickets,
              maidens = bowling.maidens + bowl.maidens,
              fours = bowling.fours + bowl.fours,
              sixes = bowling.sixes + bowl.sixes,
              bestWickets = if (isBetter) bowl.wickets else bowling.bestWickets,
              bestRuns = if (isBetter) bowl.runsConceded else bowling.bestRuns,
            )
            .withHaulBand(bowl.wickets)
      }

      var fielding = current.fielding
      var wicketKeeping = current.wicketKeeping
      if (contribution != null) {
        fielding =
          fielding.copy(
            catches = fielding.catches + contribution.catches,
            runOuts = fielding.runOuts + contribution.runOuts,
            stumpings = fielding.stumpings + contribution.stumpings,
          )
        wicketKeeping =
          wicketKeeping.copy(
            catchesAsKeeper = wicketKeeping.catchesAsKeeper + contribution.catchesAsKeeper,
            stumpings = wicketKeeping.stumpings + contribution.stumpingsAsKeeper,
            dismissals = wicketKeeping.dismissals + contribution.catchesAsKeeper + contribution.stumpingsAsKeeper,
          )
      }

      tx.set(
        ref,
        mapOf(
          "playerId" to playerId,
          "matchesPlayed" to current.matchesPlayed + if (outcome != null) 1 else 0,
          "wins" to current.wins + if (outcome == Outcome.WIN) 1 else 0,
          "losses" to current.losses + if (outcome == Outcome.LOSS) 1 else 0,
          "ties" to current.ties + if (outcome == Outcome.TIE) 1 else 0,
          "batting" to batting,
          "bowling" to bowling,
          "fielding" to fielding,
          "wicketKeeping" to wicketKeeping,
          "updatedAt" to FieldValue.serverTimestamp(),
          "lastMatchId" to matchId,
        ),
      )
      null
    }.await()
  }
}
