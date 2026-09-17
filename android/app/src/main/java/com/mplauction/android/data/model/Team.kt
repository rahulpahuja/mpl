package com.mplauction.android.data.model

import com.google.firebase.Timestamp

// teams/{teamId} — the global team registry, mirrors Team in
// src/types/index.ts. Not yet wired to a screen in this pass — a later slice
// builds Teams admin CRUD on top of this model.
data class Team(
  val teamId: String = "",
  val teamName: String = "",
  val managerId: String = "",
  val managerName: String = "",
  val logoId: String? = null,
  val logoImage: String? = null,
  val jerseyColor: String? = null,
  val createdAt: Timestamp? = null,
  val roster: List<RosterPlayer> = emptyList(),
)

// A team's persistent squad, independent of any auction — mirrors
// RosterPlayer, used to pick a match Playing XI.
data class RosterPlayer(
  val playerId: String = "",
  val name: String = "",
  val isRegisteredUser: Boolean = false,
  val playingRole: PlayingRole? = null,
  val battingHandedness: Handedness? = null,
  val bowlingHandedness: Handedness? = null,
  val battingType: BattingType? = null,
  val bowlingType: BowlingType? = null,
  val avatarId: String? = null,
  val photoURL: String? = null,
  val encryptedPhoto: String? = null,
)
