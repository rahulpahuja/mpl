package com.mplauction.android.data.model

// Embedded in Auction.players — mirrors Player in src/types/index.ts.
data class Player(
  val playerId: String = "",
  val name: String = "",
  val position: String = "",
  val basePrice: Long = 0,
  val currentBid: Long = 0,
  val currentBidder: String? = null,
  val currentBidderName: String? = null,
  val status: PlayerStatus = PlayerStatus.open,
  val wasUnsoldAssigned: Boolean? = null,
  val encryptedPhoto: String? = null,
  val avatarId: String? = null,
  val photoURL: String? = null,
  val photoSourceFilenId: String? = null,
  val battingHandedness: Handedness? = null,
  val bowlingHandedness: Handedness? = null,
  val battingType: BattingType? = null,
  val bowlingType: BowlingType? = null,
  val comboId: String? = null,
)

// Embedded in Auction.teamManagers — mirrors TeamManagerEntry.
data class TeamManagerEntry(
  val teamId: String = "",
  val managerId: String = "",
  val name: String = "",
  val maxPlayers: Long = 0,
  val purse: Long = 0,
  val tokensSpent: Long = 0,
  val remainingTokens: Long = 0,
  val logoId: String? = null,
  val logoImage: String? = null,
  val jerseyColor: String? = null,
  val managerName: String? = null,
)
