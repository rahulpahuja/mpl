package com.mplauction.android.data.model

import com.google.firebase.Timestamp

// venues/{venueId} — mirrors Venue in src/types/index.ts.
data class Venue(
  val venueId: String = "",
  val name: String = "",
  val location: String = "",
  val images: List<String> = emptyList(),
  val createdAt: Timestamp? = null,
  val retired: Boolean? = null,
  val retiredAt: Timestamp? = null,
)
