package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.Query
import com.mplauction.android.data.MatchRules
import com.mplauction.android.data.ScoreBallInput
import com.mplauction.android.data.model.BallOutcome
import com.mplauction.android.data.model.BallType
import com.mplauction.android.data.model.CoinSide
import com.mplauction.android.data.model.CoinToss
import com.mplauction.android.data.model.DayNight
import com.mplauction.android.data.model.DraftMatch
import com.mplauction.android.data.model.DraftMatchTeam
import com.mplauction.android.data.model.GroundType
import com.mplauction.android.data.model.LastBall
import com.mplauction.android.data.model.Match
import com.mplauction.android.data.model.MatchFormat as MatchFormatType
import com.mplauction.android.data.model.MatchStatus
import com.mplauction.android.data.model.MatchTeamSide
import com.mplauction.android.data.model.Toss
import com.mplauction.android.data.model.TossDecision
import com.mplauction.android.data.model.UndoSnapshot
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.toObjectOrNull
import java.security.SecureRandom
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "MatchRepository"

// Backs live ball-by-ball scoring: port of src/lib/matches.ts, following
// DraftMatchRepository's established idioms (callbackFlow snapshot
// listeners with a trySend fallback on error, runTransaction for every
// read-modify-write). A match's document ID is always the same as the
// draftMatches/{id} it was started from — see createMatchFromDraft — so a
// screen can look up player names/avatars from the draft doc without this
// repository duplicating a roster.
class MatchRepository(private val playerStatsRepository: PlayerStatsRepository) {
  private val db = Firebase.firestore

  // Cryptographically strong, so a toss can't be predicted or biased by seed.
  private val coinRandom = SecureRandom()

  private fun matchRef(matchId: String) = db.collection("matches").document(matchId)
  private fun ballsCol(matchId: String) = matchRef(matchId).collection("balls")

  private fun activeInnings(match: Match) = if (match.currentInnings == 1L) match.innings1 else match.innings2
  private fun activeInningsField(match: Match) = if (match.currentInnings == 1L) "innings1" else "innings2"

  fun observeMatch(matchId: String): Flow<Match?> = callbackFlow {
    val registration =
      matchRef(matchId).addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "match $matchId listener error", error)
          trySend(null)
          return@addSnapshotListener
        }
        trySend(snap?.toObjectOrNull<Match>())
      }
    awaitClose { registration.remove() }
  }

  // Both innings' balls, oldest first — callers split by inningsNumber.
  fun observeBalls(matchId: String): Flow<List<BallOutcome>> = callbackFlow {
    val registration =
      ballsCol(matchId).orderBy("timestamp", Query.Direction.ASCENDING).addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "balls $matchId listener error", error)
          trySend(emptyList())
          return@addSnapshotListener
        }
        trySend(snap?.documents?.mapNotNull { it.toObjectOrNull<BallOutcome>() } ?: emptyList())
      }
    awaitClose { registration.remove() }
  }

  // Newest first; single-field orderBy, so no composite index is needed.
  fun observeRecentMatches(limit: Long = 20): Flow<List<Match>> = callbackFlow {
    val registration =
      db.collection("matches").orderBy("createdAt", Query.Direction.DESCENDING).limit(limit).addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "recent matches listener error", error)
          trySend(emptyList())
          return@addSnapshotListener
        }
        trySend(snap?.documents?.mapNotNull { it.toObjectOrNull<Match>() } ?: emptyList())
      }
    awaitClose { registration.remove() }
  }

  // No Playing-XI-selection step here, unlike the web app's MatchSetup —
  // a draft match's roster (DraftMatchTeam.playerIds, captain included) is
  // already the full playing squad, so the match is created directly in
  // 'toss' status instead of lingering in 'setup'. Idempotent: if the match
  // already exists (a second "Let's Play" tap, or the host coming back) it
  // is left untouched rather than overwritten mid-game.
  suspend fun createMatchFromDraft(draftMatch: DraftMatch, oversLimit: Long, venueName: String?, hostUid: String): String {
    val matchId = draftMatch.matchId
    fun side(team: DraftMatchTeam) =
      MatchTeamSide(teamId = team.captainId, teamName = team.name, playingXI = team.playerIds, captainId = team.captainId, wicketKeeperId = null)
    // Captains with an account can score their own match alongside the host.
    val captainUids = draftMatch.teams.mapNotNull { team -> draftMatch.players.find { it.playerId == team.captainId }?.uid }
    val scorerIds = (listOf(hostUid) + captainUids).distinct()

    val doc =
      mapOf(
        "matchId" to matchId,
        "name" to draftMatch.name,
        "format" to MatchFormatType.friendly.name,
        "tournamentId" to null,
        "tournamentName" to null,
        "dayNight" to DayNight.day.name,
        "ballType" to BallType.tennis.name,
        "groundType" to GroundType.ground.name,
        "oversLimit" to oversLimit,
        "venueId" to null,
        "venueName" to venueName,
        "status" to MatchStatus.toss.name,
        "createdBy" to hostUid,
        "createdAt" to FieldValue.serverTimestamp(),
        "scheduledAt" to null,
        "teamA" to side(draftMatch.teams[0]),
        "teamB" to side(draftMatch.teams[1]),
        "toss" to null,
        "coinToss" to null,
        "currentInnings" to 1L,
        "innings1" to null,
        "innings2" to null,
        "result" to null,
        "winnerTeamId" to null,
        "scorerIds" to scorerIds,
        "lastBall" to null,
        "undoSnapshot" to null,
      )
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      if (!tx.get(ref).exists()) tx.set(ref, doc)
      null
    }.await()
    return matchId
  }

  suspend fun deleteMatch(matchId: String) {
    matchRef(matchId).delete().await()
  }

  suspend fun addScorer(matchId: String, uid: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
      if (uid !in match.scorerIds) tx.update(ref, "scorerIds", match.scorerIds + uid)
      null
    }.await()
  }

  suspend fun removeScorer(matchId: String, uid: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
      tx.update(ref, "scorerIds", match.scorerIds.filterNot { it == uid })
      null
    }.await()
  }

  // The outcome is decided here, inside the transaction, and stored — every
  // device then animates the same flip. The first call wins; a second
  // scorer tapping at the same moment is a no-op, not a re-flip.
  suspend fun flipCoin(matchId: String, callerTeamId: String, call: CoinSide) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
      if (match.status != MatchStatus.toss) throw IllegalStateException("Match is not ready for the toss")
      if (match.coinToss == null) {
        val outcome = if (coinRandom.nextBoolean()) CoinSide.heads else CoinSide.tails
        tx.update(ref, "coinToss", CoinToss(callerTeamId = callerTeamId, call = call, outcome = outcome, flippedAt = System.currentTimeMillis()))
      }
      null
    }.await()
  }

  suspend fun recordToss(matchId: String, wonByTeamId: String, decision: TossDecision) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
      if (match.status != MatchStatus.toss) throw IllegalStateException("Match is not ready for the toss")
      match.coinToss?.let { coin ->
        if (MatchRules.coinTossWinner(match.teamA, match.teamB, coin) != wonByTeamId) throw IllegalStateException("That side didn't win the toss")
      }
      val battingTeamId =
        if (decision == TossDecision.bat) wonByTeamId
        else if (match.teamA.teamId == wonByTeamId) match.teamB.teamId
        else match.teamA.teamId
      val bowlingTeamId = if (battingTeamId == match.teamA.teamId) match.teamB.teamId else match.teamA.teamId
      val innings1 = MatchRules.startInnings(battingTeamId, bowlingTeamId, 1)
      tx.update(
        ref,
        mapOf(
          "toss" to Toss(wonByTeamId = wonByTeamId, decision = decision),
          "innings1" to innings1,
          "currentInnings" to 1L,
          "status" to MatchStatus.live.name,
        ),
      )
      null
    }.await()
  }

  suspend fun pickBatsman(matchId: String, playerId: String, name: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
      val innings = activeInnings(match) ?: throw IllegalStateException("Innings has not started yet")
      val updated = MatchRules.setNextBatsman(innings, playerId, name)
      tx.update(ref, activeInningsField(match), updated)
      null
    }.await()
  }

  suspend fun pickBowler(matchId: String, playerId: String, name: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
      val innings = activeInnings(match) ?: throw IllegalStateException("Innings has not started yet")
      val updated = MatchRules.setNextBowler(innings, playerId, name)
      tx.update(ref, activeInningsField(match), updated)
      null
    }.await()
  }

  // The core scoring mutation. Runs MatchRules.recordBall (the pure
  // reducer) inside a transaction alongside the balls/{autoId} audit-log
  // write, then — only once the transaction has actually committed — folds
  // a just-completed match into career player stats, mirroring
  // matches.ts's post-transaction side effect.
  suspend fun recordBall(matchId: String, input: ScoreBallInput) {
    val completedMatch =
      db.runTransaction { tx ->
        val ref = matchRef(matchId)
        val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
        val innings = activeInnings(match) ?: throw IllegalStateException("Innings has not started yet")
        val field = activeInningsField(match)

        val preBallInnings = innings
        val preBallStatus = match.status
        val battingSide = if (match.teamA.teamId == innings.battingTeamId) match.teamA else match.teamB
        val result = MatchRules.recordBall(innings, match.oversLimit, MatchRules.maxWickets(battingSide), input)

        val ballSeq = (match.lastBall?.ballSeq ?: 0) + 1
        val ballDoc = ballsCol(matchId).document()
        tx.set(
          ballDoc,
          mapOf(
            "inningsNumber" to result.ball.inningsNumber,
            "overNumber" to result.ball.overNumber,
            "ballInOver" to result.ball.ballInOver,
            "bowlerId" to result.ball.bowlerId,
            "strikerId" to result.ball.strikerId,
            "nonStrikerId" to result.ball.nonStrikerId,
            "runs" to result.ball.runs,
            "extraType" to result.ball.extraType,
            "extraRuns" to result.ball.extraRuns,
            "isWicket" to result.ball.isWicket,
            "wicketType" to result.ball.wicketType,
            "dismissedPlayerId" to result.ball.dismissedPlayerId,
            "fielderId" to result.ball.fielderId,
            "isFreeHit" to result.ball.isFreeHit,
            "scoredBy" to result.ball.scoredBy,
            "timestamp" to FieldValue.serverTimestamp(),
          ),
        )

        val isBoundary = if (result.ball.runs == 4L) 4L else if (result.ball.runs == 6L) 6L else null
        val lastBall =
          LastBall(runs = result.ball.runs, extraType = result.ball.extraType, isWicket = result.ball.isWicket, isBoundary = isBoundary, ballSeq = ballSeq)

        var status = preBallStatus
        var matchResult = match.result
        var winnerTeamId = match.winnerTeamId
        val updatedInnings1 = if (field == "innings1") result.innings else match.innings1
        val updatedInnings2 = if (field == "innings2") result.innings else match.innings2

        if (result.inningsCompleted) {
          if (match.currentInnings == 1L) {
            status = MatchStatus.inningsBreak
          } else {
            status = MatchStatus.completed
            val (r, w) = MatchRules.computeMatchResult(match.teamA, match.teamB, updatedInnings1, updatedInnings2)
            matchResult = r
            winnerTeamId = w
          }
        }

        tx.update(
          ref,
          mapOf(
            field to result.innings,
            "lastBall" to lastBall,
            "status" to status.name,
            "result" to matchResult,
            "winnerTeamId" to winnerTeamId,
            "undoSnapshot" to UndoSnapshot(key = field, innings = preBallInnings, status = preBallStatus, ballDocPath = ballDoc.path),
          ),
        )

        if (status == MatchStatus.completed) {
          match.copy(innings1 = updatedInnings1, innings2 = updatedInnings2, status = status, result = matchResult, winnerTeamId = winnerTeamId)
        } else {
          null
        }
      }.await()

    completedMatch?.let { playerStatsRepository.applyMatch(it) }
  }

  // Single-level undo, same as web: reverses the one most recent ball via
  // Match.undoSnapshot rather than replaying the whole ball log. If the
  // undone ball was the one that completed the match, playerStats already
  // updated by recordBall's post-transaction side effect is NOT rolled
  // back — the live screen redirects to the read-only result the instant
  // status flips to completed, so this path isn't reachable in normal use.
  suspend fun undoLastBall(matchId: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
      val undo = match.undoSnapshot ?: throw IllegalStateException("Nothing to undo")
      tx.delete(db.document(undo.ballDocPath))
      tx.update(
        ref,
        mapOf(
          undo.key to undo.innings,
          "status" to undo.status.name,
          "result" to (if (undo.status == MatchStatus.completed) match.result else null),
          "winnerTeamId" to (if (undo.status == MatchStatus.completed) match.winnerTeamId else null),
          "undoSnapshot" to null,
        ),
      )
      null
    }.await()
  }

  suspend fun startSecondInnings(matchId: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<Match>() ?: throw IllegalStateException("Match not found")
      val innings1 = match.innings1
      if (match.status != MatchStatus.inningsBreak || innings1 == null) throw IllegalStateException("First innings is not finished yet")
      val battingTeamId = innings1.bowlingTeamId
      val bowlingTeamId = innings1.battingTeamId
      val target = innings1.totalRuns + 1
      val innings2 = MatchRules.startInnings(battingTeamId, bowlingTeamId, 2, target)
      tx.update(ref, mapOf("innings2" to innings2, "currentInnings" to 2L, "status" to MatchStatus.live.name, "undoSnapshot" to null))
      null
    }.await()
  }

  suspend fun abandonMatch(matchId: String, reason: String) {
    matchRef(matchId).update(mapOf("status" to MatchStatus.abandoned.name, "result" to reason)).await()
  }
}
