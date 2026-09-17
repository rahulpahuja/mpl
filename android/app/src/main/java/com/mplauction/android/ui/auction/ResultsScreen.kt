package com.mplauction.android.ui.auction

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
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
import com.mplauction.android.data.model.PlayerStatus

// Read-only squad summary — mirrors the core of Results.tsx (team-by-team
// sold squads); per-player sale price history and the "unsold" pool aren't
// broken out separately yet.
@Composable
fun ResultsScreen(auctionId: String, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: BiddingRoomViewModel = viewModel(key = "results-$auctionId") { BiddingRoomViewModel(container.auctionRepository, auctionId) }
  val auction by viewModel.auction.collectAsStateWithLifecycle()
  val current = auction

  if (current == null) {
    Column(modifier.fillMaxWidth().padding(24.dp)) { CircularProgressIndicator() }
    return
  }

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
    item {
      Text(
        "${current.players.count { it.status == PlayerStatus.sold }} sold · " +
          "${current.players.count { it.status == PlayerStatus.unsold }} unsold",
        style = MaterialTheme.typography.bodyMedium,
      )
    }
    items(current.teamManagers.sortedByDescending { it.remainingTokens }, key = { it.teamId }) { tm ->
      val squad = current.players.filter { it.currentBidder == tm.managerId && it.status == PlayerStatus.sold }
      Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
          Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(tm.name, style = MaterialTheme.typography.titleSmall)
            Text("Spent ${tm.tokensSpent}", style = MaterialTheme.typography.bodySmall)
          }
          squad.forEach { p ->
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
              Text(p.name, style = MaterialTheme.typography.bodySmall)
              Text("${p.currentBid}", style = MaterialTheme.typography.bodySmall)
            }
          }
          if (squad.isEmpty()) Text("No players won.", style = MaterialTheme.typography.bodySmall)
        }
      }
    }
  }
}
