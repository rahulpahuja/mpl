package com.mplauction.android.ui.viewer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.repository.AuctionRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

// No auth required — AuctionRepository.observeAuction hits a Firestore
// rule that's publicly gettable, same as the web app's ViewerFeed.tsx.
class ViewerFeedViewModel(auctionRepository: AuctionRepository, auctionId: String) : ViewModel() {
  val auction: StateFlow<Auction?> =
    auctionRepository.observeAuction(auctionId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
}
