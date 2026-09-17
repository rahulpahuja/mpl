package com.mplauction.android.data.remote

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

// Thin holders around the default Firebase app's Auth/Firestore instances —
// mirrors src/lib/firebase.ts's `auth`/`db` exports. Same project
// (mplauction-87c8b) as the web app, configured via google-services.json, so
// both clients read/write the same documents under the same Firestore rules.
object Firebase {
  val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
  val firestore: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }
}
