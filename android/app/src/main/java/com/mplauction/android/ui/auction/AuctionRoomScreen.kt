package com.mplauction.android.ui.auction

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AuctionStatus
import com.mplauction.android.ui.viewer.ViewerFeedScreen

// Routes to Setup / Bidding Room / Viewer Feed / Results by the auction's
// live status and the signed-in user's stake in it — mirrors both
// primaryCta's branching in AdminAuctions.tsx (which page a status implies)
// and the web app's separate TeamManagerBidding/AuctionManagerPanel vs.
// ViewerFeed routes (which page a *role* implies), combined into one
// re-entrant screen that follows the auction doc's status live instead of
// needing a fresh tap when e.g. Setup flips to live.
@Composable
fun AuctionRoomScreen(auctionId: String, currentUserUid: String?, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: BiddingRoomViewModel = viewModel(key = "room-$auctionId") { BiddingRoomViewModel(container.auctionRepository, auctionId) }
  val auction by viewModel.auction.collectAsStateWithLifecycle()
  val current = auction

  if (current == null) {
    Column(modifier.fillMaxWidth().padding(24.dp)) { CircularProgressIndicator() }
    return
  }

  val hasStake =
    currentUserUid != null &&
      (currentUserUid in current.auctionManagerIds || current.teamManagers.any { it.managerId == currentUserUid })

  when (current.status) {
    AuctionStatus.draft -> AuctionSetupScreen(auctionId, onLive = {}, modifier = modifier)
    AuctionStatus.live ->
      if (hasStake) BiddingRoomScreen(auctionId, currentUserUid, modifier = modifier)
      else ViewerFeedScreen(auctionId, currentUserUid, modifier = modifier)
    AuctionStatus.completed -> ResultsScreen(auctionId, modifier = modifier)
  }
}
