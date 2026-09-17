package com.mplauction.android.data.model

import com.google.firebase.Timestamp

// tournaments/{tournamentId} — mirrors Tournament in src/types/index.ts.
data class Tournament(
  val tournamentId: String = "",
  val name: String = "",
  val createdBy: String = "",
  val createdAt: Timestamp? = null,
  val teamIds: List<String> = emptyList(),
  val standings: List<TournamentStanding> = emptyList(),
)

data class TournamentStanding(
  val teamId: String = "",
  val teamName: String = "",
  val played: Long = 0,
  val won: Long = 0,
  val lost: Long = 0,
  val tied: Long = 0,
  val points: Long = 0,
  val runsFor: Long = 0,
  val oversFor: Double = 0.0,
  val runsAgainst: Long = 0,
  val oversAgainst: Double = 0.0,
  val nrr: Double = 0.0,
)
