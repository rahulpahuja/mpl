package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.model.Tournament
import com.mplauction.android.data.model.TournamentStanding
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.toObjectOrNull
import java.util.UUID
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "TournamentRepository"

// Port of src/lib/tournaments.ts's create/add-team paths. recomputeStandings
// isn't ported — it depends on completed matches (see MatchRepository),
// which is the next slice; a newly created tournament's standings are all
// zeros until that's wired up, same as the web app before any match plays.
class TournamentRepository {
  private val db = Firebase.firestore

  fun observeTournaments(): Flow<List<Tournament>> = callbackFlow {
    val registration =
      db.collection("tournaments").addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "tournaments listener error", error)
          trySend(emptyList())
          return@addSnapshotListener
        }
        trySend(snap?.documents?.mapNotNull { it.toObjectOrNull<Tournament>() } ?: emptyList())
      }
    awaitClose { registration.remove() }
  }

  fun observeTournament(tournamentId: String): Flow<Tournament?> = callbackFlow {
    val registration =
      db.collection("tournaments").document(tournamentId).addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "tournament $tournamentId listener error", error)
          trySend(null)
          return@addSnapshotListener
        }
        trySend(snap?.toObjectOrNull<Tournament>())
      }
    awaitClose { registration.remove() }
  }

  suspend fun createTournament(name: String, createdBy: String, teams: List<Team>): String {
    val tournamentId = UUID.randomUUID().toString()
    val standings = teams.map { emptyStanding(it) }
    val tournament =
      mapOf(
        "tournamentId" to tournamentId,
        "name" to name,
        "createdBy" to createdBy,
        "teamIds" to teams.map { it.teamId },
        "standings" to standings,
        "createdAt" to FieldValue.serverTimestamp(),
      )
    db.collection("tournaments").document(tournamentId).set(tournament).await()
    return tournamentId
  }

  suspend fun addTeamToTournament(tournamentId: String, team: Team) {
    val ref = db.collection("tournaments").document(tournamentId)
    val tournament = ref.get().await().toObjectOrNull<Tournament>() ?: throw IllegalStateException("Tournament not found")
    if (team.teamId in tournament.teamIds) return
    ref.update(mapOf("teamIds" to tournament.teamIds + team.teamId, "standings" to tournament.standings + emptyStanding(team))).await()
  }

  private fun emptyStanding(team: Team) =
    TournamentStanding(teamId = team.teamId, teamName = team.teamName)
}
