package com.mplauction.android.data.model

import com.google.firebase.Timestamp

// users/{uid} — mirrors AppUser in src/types/index.ts. Every field needs a
// default so Firestore can use the no-arg constructor Kotlin generates here.
data class AppUser(
  val uid: String = "",
  val email: String = "",
  val displayName: String = "",
  val photoURL: String? = null,
  val role: UserRole = UserRole.viewer,
  val assignedAuctions: List<String> = emptyList(),
  val phone: String = "",
  val whatsapp: String = "",
  val location: String = "",
  val battingHandedness: Handedness? = null,
  val bowlingHandedness: Handedness? = null,
  val playingRole: PlayingRole? = null,
  val battingType: BattingType? = null,
  val bowlingType: BowlingType? = null,
  val playerRequested: Boolean? = null,
  val userCode: String? = null,
  val filenPhotoId: String? = null,
  val encryptedPhoto: String? = null,
  val avatarId: String? = null,
  val jerseyNumber: Long? = null,
  val pendingPhotoRequest: PendingPhotoRequest? = null,
)

data class PendingPhotoRequest(
  val filenPhotoId: String = "",
  val requestedBy: String = "",
  val requestedByName: String = "",
  val requestedAt: Timestamp? = null,
  val status: PhotoRequestStatus = PhotoRequestStatus.pending,
  val resolvedAt: Timestamp? = null,
)
