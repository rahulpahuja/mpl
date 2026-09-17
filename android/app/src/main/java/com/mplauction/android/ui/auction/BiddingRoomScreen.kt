package com.mplauction.android.ui.auction

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.ui.common.auctionBackground
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.AuctionStatus
import com.mplauction.android.data.model.PlayerStatus
import com.mplauction.android.data.model.TeamManagerEntry

private val QUICK_BID_STEPS = listOf(1000L, 2000L, 5000L, 10000L)

@Composable
fun BiddingRoomScreen(auctionId: String, currentUserUid: String, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: BiddingRoomViewModel = viewModel(key = "bid-$auctionId") { BiddingRoomViewModel(container.auctionRepository, auctionId) }
  val auction by viewModel.auction.collectAsStateWithLifecycle()
  val busy by viewModel.busy.collectAsStateWithLifecycle()
  val error by viewModel.error.collectAsStateWithLifecycle()

  val current = auction
  if (current == null) {
    Column(modifier.fillMaxWidth().padding(24.dp)) { CircularProgressIndicator() }
    return
  }

  val isAuctionManager = currentUserUid in current.auctionManagerIds
  val myTeam = current.teamManagers.find { it.managerId == currentUserUid }
  val (justSold, clearJustSold) = rememberJustSoldPlayer(current)

  Box(modifier) {
    LazyColumn(
      contentPadding = PaddingValues(16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
      modifier = Modifier.fillMaxSize().auctionBackground(),
    ) {
      item { CurrentPlayerCard(current) }
      if (isAuctionManager) {
        item { AuctionManagerControls(current, busy, viewModel) }
      }
      if (myTeam != null) {
        item { BidControls(current, myTeam, currentUserUid, busy, viewModel) }
      }
      error?.let { item { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) } }
      item { Text("Teams", style = MaterialTheme.typography.titleSmall) }
      items(current.teamManagers.sortedByDescending { it.remainingTokens }, key = { it.teamId }) { tm ->
        TeamRow(tm, current)
      }
    }

    justSold?.let { SoldCelebrationOverlay(it, onDismiss = clearJustSold) }
  }
}

@Composable
private fun CurrentPlayerCard(auction: Auction) {
  val currentPlayer = auction.players.find { it.playerId == auction.currentPlayerId }
  Card {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      if (currentPlayer == null) {
        Text(
          if (auction.status == AuctionStatus.completed) "The auction has ended." else "Waiting for the next player...",
          style = MaterialTheme.typography.bodyMedium,
        )
      } else {
        SharedCurrentPlayerHeader(currentPlayer) { SharedCountdown(auction) }
        HorizontalDivider()
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
private fun AuctionManagerControls(auction: Auction, busy: Boolean, viewModel: BiddingRoomViewModel) {
  var timerSeconds by remember { mutableLongStateOf(auction.timerDurationSeconds) }
  Card {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Auction Manager controls", style = MaterialTheme.typography.titleSmall)
      FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(
          onClick = viewModel::startNextPlayer,
          enabled = !busy && auction.currentPlayerId == null && auction.players.any { it.status == PlayerStatus.open },
        ) { Text("Next player") }
        OutlinedButton(onClick = viewModel::markSold, enabled = !busy && auction.players.any { it.playerId == auction.currentPlayerId && it.currentBid > 0 }) {
          Text("Mark SOLD")
        }
        OutlinedButton(onClick = viewModel::markUnsold, enabled = !busy && auction.currentPlayerId != null) { Text("Unsold") }
      }
      OutlinedTextField(
        value = timerSeconds.toString(),
        onValueChange = { timerSeconds = it.toLongOrNull() ?: timerSeconds },
        label = { Text("Timer (s)") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = { viewModel.startTimer(timerSeconds) }, enabled = !busy && auction.currentPlayerId != null) { Text("Start timer") }
        OutlinedButton(onClick = viewModel::stopTimer, enabled = !busy && auction.timerEndsAt != null) { Text("Stop") }
      }
      OutlinedButton(onClick = { viewModel.endAuction {} }, enabled = !busy && auction.status == AuctionStatus.live) {
        Text("End auction")
      }
    }
  }
}

@Composable
private fun BidControls(auction: Auction, myTeam: TeamManagerEntry, uid: String, busy: Boolean, viewModel: BiddingRoomViewModel) {
  val currentPlayer = auction.players.find { it.playerId == auction.currentPlayerId }
  val minBid =
    if (currentPlayer == null) 0L
    else if (currentPlayer.currentBid > 0) currentPlayer.currentBid + auction.bidIncrement else currentPlayer.basePrice
  val isMyBid = currentPlayer?.currentBidder == uid
  val squadSize = auction.players.count { it.currentBidder == myTeam.managerId && it.status == PlayerStatus.sold }
  val squadFull = squadSize >= myTeam.maxPlayers
  val canBid = currentPlayer != null && !isMyBid && !squadFull && myTeam.remainingTokens >= minBid && auction.status == AuctionStatus.live && !busy

  Card {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
        Text("${myTeam.name} balance", style = MaterialTheme.typography.titleSmall)
        Text("${myTeam.remainingTokens} · $squadSize/${myTeam.maxPlayers}", style = MaterialTheme.typography.titleSmall)
      }
      Button(
        onClick = { viewModel.placeBid(uid, myTeam.name, minBid) },
        enabled = canBid,
        modifier = Modifier.fillMaxWidth(),
      ) { Text("Bid $minBid") }
      FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        QUICK_BID_STEPS.forEach { step ->
          val amount = minBid + step
          OutlinedButton(
            onClick = { viewModel.placeBid(uid, myTeam.name, amount) },
            enabled = canBid && amount <= myTeam.remainingTokens,
          ) { Text("+$step") }
        }
      }
      if (squadFull) Text("Your squad is full.", style = MaterialTheme.typography.bodySmall, color = Color(0xFFB45309))
    }
  }
}

@Composable
private fun TeamRow(tm: TeamManagerEntry, auction: Auction) {
  val squad = auction.players.count { it.currentBidder == tm.managerId && it.status == PlayerStatus.sold }
  Card(modifier = Modifier.fillMaxWidth()) {
    Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text(tm.name)
      Text("${tm.remainingTokens} · $squad/${tm.maxPlayers}", style = MaterialTheme.typography.bodySmall)
    }
  }
}
