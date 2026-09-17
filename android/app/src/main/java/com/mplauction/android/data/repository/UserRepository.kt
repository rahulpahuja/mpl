package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.toObjectOrNull
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
        trySend(snap?.documents?.mapNotNull { it.toObjectOrNull<AppUser>() } ?: emptyList())
      }
    awaitClose { registration.remove() }
  }

  suspend fun promoteViewerToPlayer(uid: String) {
    db.collection("users").document(uid).update(mapOf("role" to "player", "playerRequested" to false)).await()
  }

  // Admin-only per firestore.rules — broader than promoteViewerToPlayer,
  // which any manager can call but only for the viewer -> player step.
  suspend fun updateUserRole(uid: String, role: UserRole) {
    db.collection("users").document(uid).update("role", role.name).await()
  }

  // Assigning an Auction Manager must also grant them real write access to
  // the auction (firestore.rules checks auctionManagerIds, not
  // assignedAuctions) — otherwise they show up as "assigned" but can't
  // actually set anything up.
  suspend fun assignUserToAuction(uid: String, auctionId: String, currentAssignments: List<String>, role: UserRole) {
    val alreadyAssigned = auctionId in currentAssignments
    if (alreadyAssigned && role != UserRole.auctionManager) return

    val batch = db.batch()
    if (!alreadyAssigned) {
      batch.update(db.collection("users").document(uid), "assignedAuctions", currentAssignments + auctionId)
    }
    if (role == UserRole.auctionManager) {
      batch.update(db.collection("auctions").document(auctionId), "auctionManagerIds", FieldValue.arrayUnion(uid))
    }
    batch.commit().await()
  }
}
