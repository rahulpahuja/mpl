package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.mplauction.android.data.model.Venue
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.toObjectOrNull
import java.util.UUID
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "VenueRepository"

// Port of src/lib/venues.ts. Photo gallery upload/removal isn't ported —
// that needs a device image picker + the web app's compression pipeline,
// out of scope for this pass.
class VenueRepository {
  private val db = Firebase.firestore

  fun observeVenues(): Flow<List<Venue>> = callbackFlow {
    val registration =
      db.collection("venues").addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "venues listener error", error)
          trySend(emptyList())
          return@addSnapshotListener
        }
        trySend(snap?.documents?.mapNotNull { it.toObjectOrNull<Venue>() } ?: emptyList())
      }
    awaitClose { registration.remove() }
  }

  suspend fun createVenue(name: String, location: String): String {
    val venueId = UUID.randomUUID().toString()
    val venue =
      mapOf(
        "venueId" to venueId,
        "name" to name,
        "location" to location,
        "images" to emptyList<String>(),
        "createdAt" to FieldValue.serverTimestamp(),
      )
    db.collection("venues").document(venueId).set(venue).await()
    return venueId
  }

  suspend fun updateVenue(venueId: String, name: String, location: String) {
    db.collection("venues").document(venueId).update(mapOf("name" to name, "location" to location)).await()
  }

  suspend fun setRetired(venueId: String, retired: Boolean) {
    db.collection("venues")
      .document(venueId)
      .update(mapOf("retired" to retired, "retiredAt" to if (retired) FieldValue.serverTimestamp() else null))
      .await()
  }

  suspend fun deleteVenue(venueId: String) {
    db.collection("venues").document(venueId).delete().await()
  }
}
