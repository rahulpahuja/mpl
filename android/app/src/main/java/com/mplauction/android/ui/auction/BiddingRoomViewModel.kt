package com.mplauction.android.ui.auction

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.repository.AuctionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

// Port of the live-bidding paths in AuctionManagerPanel.tsx /
// TeamManagerBidding.tsx, backed by AuctionRepository. Role (Auction
// Manager vs. registered team manager vs. neither) is resolved by the
// screen from the live Auction doc + the signed-in uid, same as the web
// app's myTeam/isAuctionManagerOf checks — there's no separate "join by
// code" step for a manager already registered on the auction.
class BiddingRoomViewModel(private val auctionRepository: AuctionRepository, private val auctionId: String) : ViewModel() {
  val auction: StateFlow<Auction?> =
    auctionRepository.observeAuction(auctionId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

  private val _busy = MutableStateFlow(false)
  val busy: StateFlow<Boolean> = _busy.asStateFlow()
  private val _error = MutableStateFlow<String?>(null)
  val error: StateFlow<String?> = _error.asStateFlow()

  private fun run(block: suspend () -> Unit) {
    if (_busy.value) return
    _busy.value = true
    _error.value = null
    viewModelScope.launch {
      try {
        block()
      } catch (e: Exception) {
        _error.value = e.message ?: "Something went wrong"
      } finally {
        _busy.value = false
      }
    }
  }

  fun startNextPlayer() {
    val nextOpen = auction.value?.players?.firstOrNull { it.status == com.mplauction.android.data.model.PlayerStatus.open } ?: return
    run { auctionRepository.setCurrentPlayer(auctionId, nextOpen.playerId) }
  }

  fun startTimer(durationSeconds: Long) = run { auctionRepository.startTimer(auctionId, durationSeconds) }

  fun stopTimer() = run { auctionRepository.stopTimer(auctionId) }

  fun markSold() {
    val playerId = auction.value?.currentPlayerId ?: return
    run { auctionRepository.markSold(auctionId, playerId) }
  }

  fun markUnsold() {
    val playerId = auction.value?.currentPlayerId ?: return
    run { auctionRepository.markUnsold(auctionId, playerId) }
  }

  fun endAuction(onEnded: () -> Unit) = run {
    auctionRepository.completeAuction(auctionId)
    onEnded()
  }

  fun placeBid(managerId: String, managerName: String, amount: Long) {
    val playerId = auction.value?.currentPlayerId ?: return
    run { auctionRepository.placeBid(auctionId, playerId, managerId, managerName, amount) }
  }
}
