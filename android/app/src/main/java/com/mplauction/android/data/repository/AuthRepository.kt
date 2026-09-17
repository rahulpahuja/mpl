package com.mplauction.android.data.repository

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreException
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.toObjectOrNull
import kotlin.random.Random
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.tasks.await

private const val TAG = "AuthRepository"

// The Google OAuth "web" client id from google-services.json's oauth_client
// (client_type 3) — Google Identity Services requires this to mint an ID
// token that Firebase Auth can redeem, even though this is an Android app.
private const val GOOGLE_WEB_CLIENT_ID =
  "761770839676-3o0a2pe1vkkdc09jdh7a85rtakp2vp60.apps.googleusercontent.com"

private const val CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
private const val CODE_LENGTH = 6
private const val MAX_USER_CODE_ATTEMPTS = 5

sealed interface AuthState {
  data object Loading : AuthState
  data object SignedOut : AuthState
  data class SignedIn(val user: AppUser) : AuthState
}

// Mirrors src/lib/auth.ts + AuthProvider.tsx: Google sign-in via Credential
// Manager, a users/{uid} doc created on first sign-in (role from any pending
// invite, else 'viewer'), and a real-time listener on that doc so a role
// change made elsewhere (e.g. an Admin promoting this user on the web app)
// is reflected immediately.
class AuthRepository {
  private val auth = Firebase.auth
  private val db = Firebase.firestore

  @OptIn(ExperimentalCoroutinesApi::class)
  fun authState(): Flow<AuthState> =
    firebaseUserFlow()
      .flatMapLatest { user -> if (user == null) signedOutFlow() else userDocFlow(user.uid) }

  private fun firebaseUserFlow(): Flow<FirebaseUser?> = callbackFlow {
    val listener =
      com.google.firebase.auth.FirebaseAuth.AuthStateListener { trySend(it.currentUser) }
    auth.addAuthStateListener(listener)
    awaitClose { auth.removeAuthStateListener(listener) }
  }.distinctUntilChanged { old, new -> old?.uid == new?.uid }

  private fun signedOutFlow(): Flow<AuthState> = callbackFlow {
    trySend(AuthState.SignedOut)
    awaitClose {}
  }

  private fun userDocFlow(uid: String): Flow<AuthState> = callbackFlow {
    trySend(AuthState.Loading)
    val registration =
      db.collection("users").document(uid).addSnapshotListener { snap, error ->
        if (error != null) {
          // Same class of bug this app hit before on the web side: an
          // unhandled onSnapshot error leaves the UI hung on a loading
          // state forever. Fail closed to SignedOut instead.
          Log.e(TAG, "users/$uid listener error", error)
          trySend(AuthState.SignedOut)
          return@addSnapshotListener
        }
        val user = snap?.toObjectOrNull<AppUser>()
        trySend(if (user != null) AuthState.SignedIn(user) else AuthState.Loading)
      }
    awaitClose { registration.remove() }
  }

  // `activityContext` must be an Activity context (not the Application
  // context this repository otherwise holds) — Credential Manager launches
  // the account picker UI as an activity result, which requires one.
  suspend fun signInWithGoogle(activityContext: Context): AppUser {
    val credentialManager = CredentialManager.create(activityContext)
    val option =
      GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(false)
        .setServerClientId(GOOGLE_WEB_CLIENT_ID)
        .build()
    val request = GetCredentialRequest.Builder().addCredentialOption(option).build()

    val result =
      try {
        credentialManager.getCredential(activityContext, request)
      } catch (e: GetCredentialException) {
        throw IllegalStateException("Google sign-in failed: ${e.message}", e)
      }

    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(result.credential.data)
    val firebaseCredential = GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)
    val authResult = auth.signInWithCredential(firebaseCredential).await()
    val firebaseUser = authResult.user ?: throw IllegalStateException("Sign-in returned no user")
    return ensureUserDoc(firebaseUser)
  }

  fun signOut() {
    auth.signOut()
  }

  // Port of ensureUserDoc in src/lib/auth.ts.
  private suspend fun ensureUserDoc(firebaseUser: FirebaseUser): AppUser {
    val userRef = db.collection("users").document(firebaseUser.uid)
    val existing = userRef.get().await().toObjectOrNull<AppUser>()
    if (existing != null) return existing

    val email = firebaseUser.email ?: ""
    val normalizedEmail = email.trim().lowercase()
    val inviteRef = db.collection("invites").document(normalizedEmail)
    val inviteSnap = inviteRef.get().await()
    val role =
      if (inviteSnap.exists()) UserRole.valueOf(inviteSnap.getString("role") ?: "viewer")
      else UserRole.viewer

    val newUser =
      AppUser(
        uid = firebaseUser.uid,
        email = email,
        displayName = firebaseUser.displayName ?: email.ifEmpty { "Unknown" },
        photoURL = firebaseUser.photoUrl?.toString(),
        role = role,
        assignedAuctions = emptyList(),
        phone = "",
        whatsapp = "",
        location = "",
      )
    val userCode = createUserDocWithCode(userRef, newUser)
    if (inviteSnap.exists()) inviteRef.delete().await()
    return newUser.copy(userCode = userCode)
  }

  private suspend fun createUserDocWithCode(
    userRef: com.google.firebase.firestore.DocumentReference,
    newUser: AppUser,
  ): String =
    db.runTransaction { tx ->
      val existing = tx.get(userRef)
      if (existing.exists()) return@runTransaction existing.getString("userCode") ?: ""

      for (attempt in 0 until MAX_USER_CODE_ATTEMPTS) {
        val code = generateUserCode()
        val codeRef = db.collection("userCodes").document(code)
        val codeSnap = tx.get(codeRef)
        if (!codeSnap.exists()) {
          tx.set(codeRef, mapOf("uid" to newUser.uid))
          tx.set(userRef, newUser.copy(userCode = code).toFirestoreMap())
          return@runTransaction code
        }
      }
      throw FirebaseFirestoreException(
        "Could not generate a unique user ID. Please try again.",
        FirebaseFirestoreException.Code.ABORTED,
      )
    }.await()

  private fun generateUserCode(): String =
    (1..CODE_LENGTH).map { CODE_ALPHABET[Random.nextInt(CODE_ALPHABET.length)] }.joinToString("")
}

// Firestore's runTransaction lambda can't rely on the AppUser data class's
// automatic POJO encoding the way set(pojo) can outside a transaction, so
// this spells the field map out explicitly. createdAt uses a server
// timestamp, same as the web app.
private fun AppUser.toFirestoreMap(): Map<String, Any?> =
  mapOf(
    "uid" to uid,
    "email" to email,
    "displayName" to displayName,
    "photoURL" to photoURL,
    "role" to role.name,
    "assignedAuctions" to assignedAuctions,
    "phone" to phone,
    "whatsapp" to whatsapp,
    "location" to location,
    "userCode" to userCode,
    "createdAt" to FieldValue.serverTimestamp(),
  )
