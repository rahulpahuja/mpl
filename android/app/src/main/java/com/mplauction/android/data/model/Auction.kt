package com.mplauction.android.data.model

import com.google.firebase.Timestamp

// auctions/{auctionId} — mirrors Auction in src/types/index.ts. Field names
// and nesting must match the web app exactly: both clients read/write the
// same documents.
data class Auction(
  val auctionId: String = "",
  val name: String = "",
  val status: AuctionStatus = AuctionStatus.draft,
  val createdAt: Timestamp? = null,
  val startTime: Timestamp? = null,
  val createdBy: String = "",
  val bidIncrement: Long = 10,
  val auctionManagerIds: List<String> = emptyList(),
  val teamManagerIds: List<String> = emptyList(),
  val currentPlayerId: String? = null,
  val timerDurationSeconds: Long = 30,
  val timerEndsAt: Timestamp? = null,
  val players: List<Player> = emptyList(),
  val teamManagers: List<TeamManagerEntry> = emptyList(),
  val sport: String? = null,
  val locationCountryCode: String? = null,
  val locationCountry: String? = null,
  val locationState: String? = null,
  val locationCity: String? = null,
  val location: String? = null,
  val bgColor: String? = null,
  val titleColor: String? = null,
  val secondaryColor: String? = null,
  val backgroundImage: String? = null,
  val logoImage: String? = null,
)

// auctions/{auctionId}/teams/{teamId} — per-auction team stats snapshot,
// mirrors AuctionTeamStats.
data class AuctionTeamStats(
  val teamId: String = "",
  val teamName: String = "",
  val managerId: String = "",
  val logoId: String? = null,
  val logoImage: String? = null,
  val jerseyColor: String? = null,
  val managerName: String? = null,
  val initialPurse: Long = 0,
  val spent: Long = 0,
  val balance: Long = 0,
  val players: List<TeamPlayerRecord> = emptyList(),
)

data class TeamPlayerRecord(
  val playerId: String = "",
  val playerName: String = "",
  val soldAt: Long = 0,
  val wasUnsoldAssigned: Boolean? = null,
)

data class BidEntry(
  val managerId: String = "",
  val managerName: String = "",
  val amount: Long = 0,
  val timestamp: Long = 0,
)

// auctions/{auctionId}/bids/{playerId} — mirrors PlayerBids.
data class PlayerBids(
  val playerId: String = "",
  val bids: List<BidEntry> = emptyList(),
  val finalBidder: String? = null,
  val finalAmount: Long? = null,
  val awardedAt: Timestamp? = null,
)
