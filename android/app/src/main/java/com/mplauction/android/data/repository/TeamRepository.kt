package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.mplauction.android.data.model.RosterPlayer
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.remote.Firebase
import java.util.UUID
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "TeamRepository"

// Port of src/lib/teams.ts. The global `teams` collection is only listable
// by Admin/Auction Manager per firestore.rules — a 'manager' (team captain)
// role gets permission-denied on observeTeams(), which is surfaced as an
// empty list with a logged error rather than a crash; captains see their
// own team through the auction they're registered on instead (see the
// bidding room).
class TeamRepository {
  private val db = Firebase.firestore

  fun observeTeams(): Flow<List<Team>> = callbackFlow {
    val registration =
      db.collection("teams").addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "teams listener error", error)
          trySend(emptyList())
          return@addSnapshotListener
        }
        trySend(snap?.documents?.mapNotNull { it.toObject(Team::class.java) } ?: emptyList())
      }
    awaitClose { registration.remove() }
  }

  fun observeTeam(teamId: String): Flow<Team?> = callbackFlow {
    val registration =
      db.collection("teams").document(teamId).addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "team $teamId listener error", error)
          return@addSnapshotListener
        }
        trySend(snap?.toObject(Team::class.java))
      }
    awaitClose { registration.remove() }
  }

  // Resolves an Admin/Auction Manager's typed userCode into the user it
  // belongs to, so a team's manager can be picked by ID the same way the web
  // app's captain-by-ID search works (see lib/userCode.ts's doc comment).
  suspend fun findUserByCode(userCode: String): AppUserSummary? {
    val snap = db.collection("users").whereEqualTo("userCode", userCode.trim().uppercase()).limit(1).get().await()
    val doc = snap.documents.firstOrNull() ?: return null
    return AppUserSummary(uid = doc.id, displayName = doc.getString("displayName") ?: "", userCode = userCode)
  }

  suspend fun createTeam(teamName: String, managerId: String, managerName: String, jerseyColor: String?): String {
    val teamId = UUID.randomUUID().toString()
    val team =
      mapOf(
        "teamId" to teamId,
        "teamName" to teamName,
        "managerId" to managerId,
        "managerName" to managerName,
        "jerseyColor" to jerseyColor,
        "createdAt" to FieldValue.serverTimestamp(),
      )
    db.collection("teams").document(teamId).set(team).await()
    return teamId
  }

  suspend fun addToRoster(teamId: String, player: RosterPlayer) {
    val ref = db.collection("teams").document(teamId)
    val team = ref.get().await().toObject(Team::class.java) ?: throw IllegalStateException("Team not found")
    if (team.roster.any { it.playerId == player.playerId }) {
      throw IllegalStateException("${player.name} is already on this team's roster")
    }
    ref.update("roster", team.roster + player).await()
  }

  suspend fun removeFromRoster(teamId: String, playerId: String) {
    val ref = db.collection("teams").document(teamId)
    val team = ref.get().await().toObject(Team::class.java) ?: return
    ref.update("roster", team.roster.filterNot { it.playerId == playerId }).await()
  }
}

data class AppUserSummary(val uid: String, val displayName: String, val userCode: String)
