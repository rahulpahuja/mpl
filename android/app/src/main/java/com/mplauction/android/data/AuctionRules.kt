package com.mplauction.android.data

import com.mplauction.android.data.model.Player
import com.mplauction.android.data.model.PlayerStatus
import com.mplauction.android.data.model.TeamManagerEntry

// Port of src/lib/auctionRules.ts. Combo lots (multiple players sold as one
// group) aren't supported yet on Android — every call site here treats
// groupSize as 1, unlike the web app's version which threads a real group
// size through for combo bids/sales.
object AuctionRules {
  fun minAcceptableBid(player: Player, bidIncrement: Long): Long =
    if (player.currentBid > 0) player.currentBid + bidIncrement else player.basePrice

  class InvalidBidException(message: String) : Exception(message)

  fun assertValidBid(
    player: Player,
    manager: TeamManagerEntry,
    amount: Long,
    bidIncrement: Long,
    soldCountForManager: Int,
  ) {
    if (player.status != PlayerStatus.open && player.status != PlayerStatus.active) {
      throw InvalidBidException("Player is not open for bidding")
    }
    val minAcceptable = minAcceptableBid(player, bidIncrement)
    if (amount < minAcceptable) throw InvalidBidException("Bid must be at least $minAcceptable")
    if (amount > manager.remainingTokens) throw InvalidBidException("Insufficient tokens for this bid")
    if (soldCountForManager + 1 > manager.maxPlayers) {
      throw InvalidBidException("${manager.name} has already reached its ${manager.maxPlayers}-player limit")
    }
  }
}
