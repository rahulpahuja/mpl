package com.mplauction.android.ui.auction

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.repository.AuctionRepository
import com.mplauction.android.data.repository.TeamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AuctionSetupUiState(
  val auction: Auction? = null,
  val availableTeams: List<Team> = emptyList(),
  val playerName: String = "",
  val playerPosition: String = "",
  val playerBasePrice: String = "1000",
  val addingPlayer: Boolean = false,
  val purse: String = "10000",
  val maxPlayers: String = "15",
  val addingTeam: Boolean = false,
  val busy: Boolean = false,
  val error: String? = null,
)

// Port of AuctionSetup.tsx's add-team / add-player / go-live paths, backed
// directly by AuctionRepository (itself a port of the matching lib/
// auctions.ts functions).
class AuctionSetupViewModel(
  private val auctionRepository: AuctionRepository,
  private val teamRepository: TeamRepository,
  private val auctionId: String,
) : ViewModel() {
  private val playerNameState = MutableStateFlow("")
  private val playerPositionState = MutableStateFlow("")
  private val playerBasePriceState = MutableStateFlow("1000")
  private val addingPlayerState = MutableStateFlow(false)
  private val purseState = MutableStateFlow("10000")
  private val maxPlayersState = MutableStateFlow("15")
  private val addingTeamState = MutableStateFlow(false)
  private val busyState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  private data class PlayerForm(val name: String, val position: String, val basePrice: String, val adding: Boolean)
  private data class TeamForm(val purse: String, val maxPlayers: String, val adding: Boolean)

  private val playerForm =
    combine(playerNameState, playerPositionState, playerBasePriceState, addingPlayerState, ::PlayerForm)
  private val teamForm = combine(purseState, maxPlayersState, addingTeamState, ::TeamForm)
  private val statusForm = combine(busyState, errorState) { busy, error -> busy to error }

  val uiState: StateFlow<AuctionSetupUiState> =
    combine(
      auctionRepository.observeAuction(auctionId),
      teamRepository.observeTeams(),
      playerForm,
      teamForm,
      statusForm,
    ) { auction, teams, pForm, tForm, status ->
      val available = teams.filter { t -> auction?.teamManagers?.none { it.teamId == t.teamId } != false }
      AuctionSetupUiState(
        auction = auction,
        availableTeams = available,
        playerName = pForm.name,
        playerPosition = pForm.position,
        playerBasePrice = pForm.basePrice,
        addingPlayer = pForm.adding,
        purse = tForm.purse,
        maxPlayers = tForm.maxPlayers,
        addingTeam = tForm.adding,
        busy = status.first,
        error = status.second,
      )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AuctionSetupUiState())

  fun onPlayerNameChanged(v: String) { playerNameState.value = v }
  fun onPlayerPositionChanged(v: String) { playerPositionState.value = v }
  fun onPlayerBasePriceChanged(v: String) { playerBasePriceState.value = v }
  fun onPurseChanged(v: String) { purseState.value = v }
  fun onMaxPlayersChanged(v: String) { maxPlayersState.value = v }

  fun addPlayer() {
    val name = playerNameState.value.trim()
    val basePrice = playerBasePriceState.value.toLongOrNull()
    if (name.isEmpty() || basePrice == null || addingPlayerState.value) return
    addingPlayerState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        auctionRepository.addPlayer(auctionId, name, playerPositionState.value.trim(), basePrice)
        playerNameState.value = ""
        playerPositionState.value = ""
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't add that player"
      } finally {
        addingPlayerState.value = false
      }
    }
  }

  fun addTeam(team: Team) {
    val purse = purseState.value.toLongOrNull()
    val maxPlayers = maxPlayersState.value.toLongOrNull()
    if (purse == null || maxPlayers == null || addingTeamState.value) return
    addingTeamState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        auctionRepository.addTeamToAuction(auctionId, team, purse, maxPlayers)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't add that team"
      } finally {
        addingTeamState.value = false
      }
    }
  }

  fun goLive(onLive: () -> Unit) {
    busyState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        auctionRepository.goLive(auctionId)
        onLive()
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't start the auction"
      } finally {
        busyState.value = false
      }
    }
  }
}
