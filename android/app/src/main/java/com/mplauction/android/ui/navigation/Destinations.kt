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

// Pushed from the Matches tab — a specific match's lobby/draft/reveal flow
// (see DraftScreen). Unlike AuctionDetail, DraftScreen doesn't need a name
// carried in for its top-bar title: reachable equally by tapping a known
// match or typing an unknown ID to join, so it always resolves the title
// from the live doc instead.
@Serializable data class MatchLobby(val matchId: String) : NavKey

// Pushed from the lobby's "Import players" button — see ImportPlayersScreen.
@Serializable data class ImportDraftPlayers(val matchId: String) : NavKey

// The host's "Let's Play" after a draft completes: overs + location, then
// the match starts (see MatchConfigScreen). matchId is the draft's ID, which
// the live match reuses as its own.
@Serializable data class MatchConfig(val matchId: String) : NavKey

// The live match — toss, scoring, scorecard, result (see MatchScreen).
@Serializable data class LiveMatch(val matchId: String) : NavKey

// Public, no-login destinations — reachable from the signed-out Login
// screen (see JoinAuctionScreen) and also pushed for a signed-in user
// without an Auction Manager/team-manager stake in a live auction.
@Serializable data object Watch : NavKey

@Serializable data class ViewerFeed(val auctionId: String, val name: String) : NavKey
