package com.mplauction.android.ui.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable data object Login : NavKey

@Serializable data object ClaimAdmin : NavKey

@Serializable data object Home : NavKey

// Pushed when an auction card is tapped — AuctionRoomScreen resolves this to
// Setup / Bidding Room / Results by the auction's live status. `name` is
// only for the top bar title — carried from the tapped card so it renders
// before the auction doc itself has loaded.
@Serializable data class AuctionDetail(val auctionId: String, val name: String) : NavKey

@Serializable data class TeamDetail(val teamId: String, val teamName: String) : NavKey

// Public, no-login destinations — reachable from the signed-out Login
// screen (see JoinAuctionScreen) and also pushed for a signed-in user
// without an Auction Manager/team-manager stake in a live auction.
@Serializable data object Watch : NavKey

@Serializable data class ViewerFeed(val auctionId: String, val name: String) : NavKey
