package com.mplauction.android.data.repository

import android.util.Log
import com.mplauction.android.data.remote.Firebase
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "BootstrapRepository"

// Port of src/lib/bootstrap.ts + useAdminClaimed.ts: the first-run "claim
// admin" flow, gated by a single meta/adminClaimed doc.
class BootstrapRepository {
  private val db = Firebase.firestore

  fun adminClaimed(): Flow<Boolean> = callbackFlow {
    val registration =
      db.collection("meta").document("adminClaimed").addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "meta/adminClaimed listener error", error)
          trySend(false)
          return@addSnapshotListener
        }
        trySend(snap?.exists() == true && snap.getBoolean("claimed") == true)
      }
    awaitClose { registration.remove() }
  }

  suspend fun claimFirstAdmin(uid: String) {
    val adminClaimedRef = db.collection("meta").document("adminClaimed")
    val userRef = db.collection("users").document(uid)
    db.runTransaction { tx ->
      val claimedSnap = tx.get(adminClaimedRef)
      if (claimedSnap.exists() && claimedSnap.getBoolean("claimed") == true) {
        throw IllegalStateException("An admin has already been claimed for this app.")
      }
      val userSnap = tx.get(userRef)
      if (!userSnap.exists()) {
        throw IllegalStateException("User profile not found. Sign in first, then try again.")
      }
      tx.set(adminClaimedRef, mapOf("claimed" to true))
      tx.update(userRef, "role", "admin")
      null
    }.await()
  }
}
