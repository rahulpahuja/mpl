package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.Query
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.DraftMatch
import com.mplauction.android.data.model.DraftMatchPick
import com.mplauction.android.data.model.DraftMatchPlayer
import com.mplauction.android.data.model.DraftMatchStatus
import com.mplauction.android.data.model.DraftMatchTeam
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.generateShortId
import com.mplauction.android.data.remote.toObjectOrNull
import java.util.Date
import java.util.UUID
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "DraftMatchRepository"

// Backs the "Matches" tab's Team Draft flow: a host creates a match (gets a
// short shareable ID), other signed-in users join it, the host builds the
// roster (existing platform players, or ones typed in with no account),
// picks two captains, and the two captains — or the host, standing in for
// anyone not actively on their own phone — alternate picks until every
// player's on a team. Turn order/pick legality are enforced here, not in
// firestore.rules, matching how bid amounts already work for auctions.
class DraftMatchRepository {
  private val db = Firebase.firestore

  private fun matchRef(matchId: String) = db.collection("draftMatches").document(matchId)

  // Filters to lobby-status client-side (like AuctionsDirectoryScreen
  // already does for live auctions) rather than a whereEqualTo+orderBy
  // query, which would need a composite index nobody's created — and if
  // that query ever did error (a missing index, or these rules not deployed
  // yet), the old "return without trySend" below would silently freeze
  // every screen combining this flow, including local UI state like typed
  // text (see MatchesListViewModel) — so every listener here now always
  // emits a safe fallback instead of hanging.
  fun observeOpenMatches(): Flow<List<DraftMatch>> = callbackFlow {
    val registration =
      db.collection("draftMatches")
        .orderBy("createdAt", Query.Direction.DESCENDING)
        .addSnapshotListener { snap, error ->
          if (error != null) {
            Log.e(TAG, "open matches listener error", error)
            trySend(emptyList())
            return@addSnapshotListener
          }
          trySend(snap?.documents?.mapNotNull { it.toObjectOrNull<DraftMatch>() } ?: emptyList())
        }
    awaitClose { registration.remove() }
  }

  fun observeMatch(matchId: String): Flow<DraftMatch?> = callbackFlow {
    val registration =
      matchRef(matchId).addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "match $matchId listener error", error)
          trySend(null)
          return@addSnapshotListener
        }
        trySend(snap?.toObjectOrNull<DraftMatch>())
      }
    awaitClose { registration.remove() }
  }

  // The host is added to the roster (and joinedUids) immediately — the
  // common case is hosting your own pickup game, so they shouldn't have to
  // separately "join" the match they just created.
  suspend fun createMatch(name: String, host: AppUser): String {
    val matchId = generateShortId()
    val hostPlayer =
      DraftMatchPlayer(playerId = host.uid, name = host.displayName, uid = host.uid, photoURL = host.photoURL, avatarId = host.avatarId, role = host.playingRole)
    val doc =
      mapOf(
        "matchId" to matchId,
        "name" to name,
        "hostUid" to host.uid,
        "hostName" to host.displayName,
        "createdAt" to FieldValue.serverTimestamp(),
        "status" to DraftMatchStatus.lobby.name,
        "players" to listOf(hostPlayer),
        "joinedUids" to listOf(host.uid),
        "captainIds" to emptyList<String>(),
        "teams" to emptyList<Any>(),
        "pool" to emptyList<String>(),
        "turnIndex" to 0L,
        "turnSeconds" to 15L,
        "timerEndsAt" to null,
        "lastPick" to null,
      )
    matchRef(matchId).set(doc).await()
    return matchId
  }

  suspend fun joinMatch(matchId: String, user: AppUser) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<DraftMatch>() ?: throw IllegalStateException("Match not found")
      if (user.uid in match.joinedUids) return@runTransaction null
      val player = DraftMatchPlayer(playerId = user.uid, name = user.displayName, uid = user.uid, photoURL = user.photoURL, avatarId = user.avatarId, role = user.playingRole)
      tx.update(ref, mapOf("joinedUids" to match.joinedUids + user.uid, "players" to match.players + player))
      null
    }.await()
  }

  suspend fun addRegisteredPlayer(matchId: String, user: AppUser) {
    addPlayer(matchId, DraftMatchPlayer(playerId = user.uid, name = user.displayName, uid = user.uid, photoURL = user.photoURL, avatarId = user.avatarId, role = user.playingRole))
  }

  suspend fun addManualPlayer(matchId: String, name: String, phone: String?, email: String?) {
    addPlayer(matchId, DraftMatchPlayer(playerId = UUID.randomUUID().toString(), name = name, phone = phone?.ifBlank { null }, email = email?.ifBlank { null }))
  }

  private suspend fun addPlayer(matchId: String, player: DraftMatchPlayer) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<DraftMatch>() ?: throw IllegalStateException("Match not found")
      if (match.players.any { it.playerId == player.playerId }) return@runTransaction null
      tx.update(ref, "players", match.players + player)
      null
    }.await()
  }

  // Lobby-only cleanup: drop someone who can't play after all.
  suspend fun removePlayer(matchId: String, playerId: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<DraftMatch>() ?: throw IllegalStateException("Match not found")
      tx.update(
        ref,
        mapOf(
          "players" to match.players.filterNot { it.playerId == playerId },
          "joinedUids" to match.joinedUids.filterNot { it == playerId },
          "captainIds" to match.captainIds.filterNot { it == playerId },
        ),
      )
      null
    }.await()
  }

  suspend fun setCaptains(matchId: String, captainIds: List<String>) {
    matchRef(matchId).update("captainIds", captainIds).await()
  }

  suspend fun confirmCaptains(matchId: String) {
    matchRef(matchId).update("status", DraftMatchStatus.captainReveal.name).await()
  }

  // Host-only per firestore.rules (isDraftHost) — lets them clean up a
  // match they created, whether it never got past the lobby or is mid-draft.
  suspend fun deleteMatch(matchId: String) {
    matchRef(matchId).delete().await()
  }

  // Called by the host's own client after the reveal animation finishes —
  // see DraftViewModel. Builds the two teams and the pick pool from
  // whoever's actually on the roster right now.
  suspend fun beginDrafting(matchId: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<DraftMatch>() ?: throw IllegalStateException("Match not found")
      // Guards against a second client's delayed call re-running this after
      // the draft is already underway (see DraftViewModel — only the host
      // schedules this, but the check makes a race harmless either way).
      if (match.status != DraftMatchStatus.captainReveal || match.captainIds.size != 2) return@runTransaction null
      val teams =
        match.captainIds.map { captainId ->
          val captain = match.players.find { it.playerId == captainId }
          DraftMatchTeam(captainId = captainId, name = "Team ${captain?.name.orEmpty()}", playerIds = listOf(captainId))
        }
      val pool = match.players.map { it.playerId }.filterNot { it in match.captainIds }
      tx.update(
        ref,
        mapOf(
          "status" to DraftMatchStatus.drafting.name,
          "teams" to teams,
          "pool" to pool,
          "turnIndex" to 0L,
          "timerEndsAt" to turnDeadline(match.turnSeconds),
        ),
      )
      null
    }.await()
  }

  private fun turnDeadline(turnSeconds: Long) = Timestamp(Date(System.currentTimeMillis() + turnSeconds * 1000))

  suspend fun pickPlayer(matchId: String, playerId: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<DraftMatch>() ?: throw IllegalStateException("Match not found")
      if (match.status != DraftMatchStatus.drafting || playerId !in match.pool) return@runTransaction null
      applyPick(tx, ref, match, playerId, auto = false)
      null
    }.await()
  }

  // Any client can call this opportunistically once it notices the
  // deadline's passed — the transaction re-reads the live doc, so if two
  // clients race, only the first commit actually moves the turn.
  suspend fun autoPickIfExpired(matchId: String) {
    db.runTransaction { tx ->
      val ref = matchRef(matchId)
      val match = tx.get(ref).toObjectOrNull<DraftMatch>() ?: return@runTransaction null
      val deadline = match.timerEndsAt ?: return@runTransaction null
      if (match.status != DraftMatchStatus.drafting || deadline.toDate().time > System.currentTimeMillis()) return@runTransaction null
      val fallback = match.pool.randomOrNull() ?: return@runTransaction null
      applyPick(tx, ref, match, fallback, auto = true)
      null
    }.await()
  }

  private fun applyPick(tx: com.google.firebase.firestore.Transaction, ref: com.google.firebase.firestore.DocumentReference, match: DraftMatch, playerId: String, auto: Boolean) {
    val teamIndex = match.turnIndex
    val teams =
      match.teams.mapIndexed { i, t -> if (i.toLong() == teamIndex) t.copy(playerIds = t.playerIds + playerId) else t }
    val pool = match.pool.filterNot { it == playerId }
    val done = pool.isEmpty()
    tx.update(
      ref,
      mapOf(
        "teams" to teams,
        "pool" to pool,
        "turnIndex" to if (done) teamIndex else 1L - teamIndex,
        "status" to (if (done) DraftMatchStatus.complete.name else DraftMatchStatus.drafting.name),
        "timerEndsAt" to (if (done) null else turnDeadline(match.turnSeconds)),
        "lastPick" to DraftMatchPick(playerId, teamIndex, auto, System.currentTimeMillis()),
      ),
    )
  }
}
