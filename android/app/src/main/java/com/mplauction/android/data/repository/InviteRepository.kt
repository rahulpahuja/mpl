package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.mplauction.android.data.model.Invite
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.toObjectOrNull
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "InviteRepository"

// Port of lib/invites.ts — a pending role for someone who hasn't signed in
// yet, applied by AuthRepository the moment they first sign in.
class InviteRepository {
  private val db = Firebase.firestore

  fun observeInvites(): Flow<List<Invite>> = callbackFlow {
    val registration =
      db.collection("invites").addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "invites listener error", error)
          trySend(emptyList())
          return@addSnapshotListener
        }
        trySend(snap?.documents?.mapNotNull { it.toObjectOrNull<Invite>() } ?: emptyList())
      }
    awaitClose { registration.remove() }
  }

  suspend fun createInvite(email: String, role: UserRole) {
    val normalized = email.trim().lowercase()
    db.collection("invites")
      .document(normalized)
      .set(mapOf("email" to normalized, "role" to role.name, "createdAt" to FieldValue.serverTimestamp()))
      .await()
  }

  suspend fun deleteInvite(email: String) {
    db.collection("invites").document(email.trim().lowercase()).delete().await()
  }
}
