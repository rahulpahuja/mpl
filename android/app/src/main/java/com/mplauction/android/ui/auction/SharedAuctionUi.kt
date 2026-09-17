package com.mplauction.android.ui.auction

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.Player
import kotlinx.coroutines.delay

// Shared between BiddingRoomScreen (stakeholder view) and ViewerFeedScreen
// (public read-only view) — same countdown/current-player presentation the
// web app's TeamManagerBidding/ViewerFeed pages both build on top of
// useCountdown.

@Composable
fun SharedCurrentPlayerHeader(player: Player, trailing: @Composable () -> Unit) {
  Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
    Column {
      Text(player.name, style = MaterialTheme.typography.headlineSmall)
      if (player.position.isNotBlank()) {
        Text(player.position, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
      }
    }
    trailing()
  }
}

@Composable
fun SharedCountdown(auction: Auction) {
  val timerEndsAt = auction.timerEndsAt ?: return
  val remaining by
    produceState(initialValue = secondsUntil(timerEndsAt.toDate().time), timerEndsAt) {
      while (true) {
        value = secondsUntil(timerEndsAt.toDate().time)
        if (value <= 0) break
        delay(500)
      }
    }
  Text(
    "${remaining}s",
    style = MaterialTheme.typography.headlineMedium,
    color = if (remaining <= 5) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
  )
}

private fun secondsUntil(epochMillis: Long): Long = ((epochMillis - System.currentTimeMillis()) / 1000).coerceAtLeast(0)
