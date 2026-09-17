package com.mplauction.android.ui.viewer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.ui.common.auctionBackground
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.TeamManagerEntry
import com.mplauction.android.ui.auction.SharedCountdown
import com.mplauction.android.ui.auction.SoldCelebrationOverlay
import com.mplauction.android.ui.auction.rememberJustSoldPlayer
import com.mplauction.android.ui.auction.SharedCurrentPlayerHeader

// Public, read-only — no auth required (mirrors ViewerFeed.tsx / the
// firestore.rules `auctions` collection being publicly gettable/listable).
// `currentUserUid` is optional: null for an anonymous/signed-out viewer,
// non-null when a signed-in user with no auction-manager/team-manager stake
// lands here (they still get the "my role" message if they're a linked
// player on this auction).
@Composable
fun ViewerFeedScreen(auctionId: String, currentUserUid: String?, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: ViewerFeedViewModel = viewModel(key = "viewer-$auctionId") { ViewerFeedViewModel(container.auctionRepository, auctionId) }
  val auction by viewModel.auction.collectAsStateWithLifecycle()
  val current = auction

  if (current == null) {
    Column(modifier.fillMaxWidth().padding(24.dp)) { CircularProgressIndicator() }
    return
  }

  val myPlayer = currentUserUid?.let { uid -> current.players.find { it.playerId == uid } }
  val myTeam = myPlayer?.currentBidder?.let { bidder -> current.teamManagers.find { it.managerId == bidder } }
  val myTeamManagerEntry = currentUserUid?.let { uid -> current.teamManagers.find { it.managerId == uid } }
  val amAuctionManager = currentUserUid != null && currentUserUid in current.auctionManagerIds
  val roleMessage = myRoleMessage(current, myPlayer, myTeam, myTeamManagerEntry, amAuctionManager)
  val (justSold, clearJustSold) = rememberJustSoldPlayer(current)

  Box(modifier) {
    LazyColumn(
      contentPadding = PaddingValues(16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
      modifier = Modifier.fillMaxSize().auctionBackground(),
    ) {
      item { Text("Status: ${current.status.name}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
      roleMessage?.let { item { Card { Text(it, Modifier.padding(12.dp), style = MaterialTheme.typography.bodyMedium) } } }
      item { LiveScoreboardCard(current) }
      item { Text("Team standings", style = MaterialTheme.typography.titleSmall) }
      items(current.teamManagers.sortedByDescending { it.tokensSpent }, key = { it.teamId }) { tm -> StandingRow(tm) }
      if (current.teamManagers.isEmpty()) item { Text("No teams yet.", style = MaterialTheme.typography.bodyMedium) }
    }

    justSold?.let { SoldCelebrationOverlay(it, onDismiss = clearJustSold) }
  }
}

private fun myRoleMessage(
  auction: Auction,
  myPlayer: com.mplauction.android.data.model.Player?,
  myTeam: TeamManagerEntry?,
  myTeamManagerEntry: TeamManagerEntry?,
  amAuctionManager: Boolean,
): String? =
  when {
    myPlayer != null && myPlayer.status == com.mplauction.android.data.model.PlayerStatus.sold && myTeam != null ->
      "You've been sold to ${myTeam.name} for ${myPlayer.currentBid}!"
    myPlayer != null && myPlayer.status == com.mplauction.android.data.model.PlayerStatus.unsold ->
      "You went unsold — you may still get picked up later."
    myPlayer != null && myPlayer.playerId == auction.currentPlayerId -> "You're up on the block right now!"
    myPlayer != null -> "You're in the queue, not sold yet."
    myTeamManagerEntry != null -> "You're the captain of ${myTeamManagerEntry.name}."
    amAuctionManager -> "You're an Auction Manager for this auction."
    else -> null
  }

@Composable
private fun LiveScoreboardCard(auction: Auction) {
  val currentPlayer = auction.players.find { it.playerId == auction.currentPlayerId }
  Card {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Live scoreboard", style = MaterialTheme.typography.titleSmall)
      if (currentPlayer == null) {
        Text("Waiting for the next player...", style = MaterialTheme.typography.bodyMedium)
      } else {
        SharedCurrentPlayerHeader(currentPlayer) { SharedCountdown(auction) }
        Text("Current bid", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
          "${if (currentPlayer.currentBid > 0) currentPlayer.currentBid else currentPlayer.basePrice}",
          style = MaterialTheme.typography.displaySmall,
          color = MaterialTheme.colorScheme.secondary,
        )
        Text(
          currentPlayer.currentBidderName ?: "No bids yet",
          style = MaterialTheme.typography.bodyMedium,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }
  }
}

@Composable
private fun StandingRow(tm: TeamManagerEntry) {
  Card(modifier = Modifier.fillMaxWidth()) {
    Column(Modifier.padding(12.dp)) {
      Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
        Text(tm.name, style = MaterialTheme.typography.bodyLarge)
        Text("Spent ${tm.tokensSpent} · Left ${tm.remainingTokens}", style = MaterialTheme.typography.bodySmall)
      }
      tm.managerName?.let { Text("Captain: $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
  }
}
