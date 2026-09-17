package com.mplauction.android.data.remote

import android.util.Log
import com.google.firebase.firestore.DocumentSnapshot

private const val TAG = "FirestoreSafety"

// Firestore's toObject() throws when a stored string doesn't match any
// constant of a target enum field (e.g. legacy/renamed values from the web
// app) — and since every repository calls it straight off a live
// addSnapshotListener callback, that throw crashes the whole app instead of
// just failing to render one document. Skip the bad document instead.
fun <T> DocumentSnapshot.toObjectOrNull(clazz: Class<T>): T? =
  try {
    toObject(clazz)
  } catch (e: RuntimeException) {
    Log.w(TAG, "Skipping $id: couldn't deserialize as ${clazz.simpleName}", e)
    null
  }

inline fun <reified T> DocumentSnapshot.toObjectOrNull(): T? = toObjectOrNull(T::class.java)
