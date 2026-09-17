package com.mplauction.android.data.repository

import android.util.Log
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.remote.Firebase
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "UserRepository"

// Port of the profile-edit and player-management paths in src/lib/users.ts.
// Cricket-specific fields (handedness, playing role, batting/bowling type,
// jersey number) aren't editable on Android yet — only the identity/contact
// fields the web app's own Profile page leads with.
class UserRepository {
  private val db = Firebase.firestore

  suspend fun updateOwnProfile(uid: String, displayName: String, phone: String, whatsapp: String, location: String) {
    db.collection("users")
      .document(uid)
      .update(mapOf("displayName" to displayName, "phone" to phone, "whatsapp" to whatsapp, "location" to location))
      .await()
  }

  // Only listable by Admin/Auction Manager/Team Manager per firestore.rules
  // — same permission story as TeamRepository.observeTeams().
  fun observeUsers(): Flow<List<AppUser>> = callbackFlow {
    val registration =
      db.collection("users").addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "users listener error", error)
          trySend(emptyList())
          return@addSnapshotListener
        }
        trySend(snap?.documents?.mapNotNull { it.toObject(AppUser::class.java) } ?: emptyList())
      }
    awaitClose { registration.remove() }
  }

  suspend fun promoteViewerToPlayer(uid: String) {
    db.collection("users").document(uid).update(mapOf("role" to "player", "playerRequested" to false)).await()
  }
}
