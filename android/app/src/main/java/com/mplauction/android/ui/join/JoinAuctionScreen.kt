package com.mplauction.android.ui.join

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.AuctionStatus

// Public, no-login entry point — mirrors JoinAuction.tsx: pick a live
// auction from the list, or type an auction ID directly. Reachable both
// from the signed-out Login screen and from a signed-in viewer/player who
// just wants to watch.
@Composable
fun JoinAuctionScreen(onJoin: (Auction) -> Unit, onJoinById: (String) -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: JoinAuctionViewModel = viewModel(key = "join-auctions") { JoinAuctionViewModel(container.auctionRepository) }
  val auctions by viewModel.auctions.collectAsStateWithLifecycle()
  val liveAuctions = auctions.filter { it.status == AuctionStatus.live }
  var typedId by remember { mutableStateOf("") }

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
    item { Text("Pick an ongoing auction, or enter an auction ID directly.", style = MaterialTheme.typography.bodyMedium) }
    items(liveAuctions, key = { it.auctionId }) { auction ->
      Card(onClick = { onJoin(auction) }, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Text(auction.name, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
          SuggestionChip(onClick = {}, label = { Text("live") })
        }
      }
    }
    if (liveAuctions.isEmpty()) item { Text("No auctions are live right now.", style = MaterialTheme.typography.bodyMedium) }
    item {
      Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
          value = typedId,
          onValueChange = { typedId = it.uppercase() },
          label = { Text("Auction ID, e.g. A1B2C3") },
          singleLine = true,
          modifier = Modifier.fillMaxWidth(),
        )
        Button(onClick = { onJoinById(typedId.trim()) }, enabled = typedId.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
          Text("Join")
        }
      }
    }
  }
}
