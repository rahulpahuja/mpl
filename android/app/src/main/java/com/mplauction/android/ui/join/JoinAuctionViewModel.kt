package com.mplauction.android.ui.join

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.repository.AuctionRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class JoinAuctionViewModel(auctionRepository: AuctionRepository) : ViewModel() {
  val auctions: StateFlow<List<Auction>> =
    auctionRepository.observeAuctions().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
}
