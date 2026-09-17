package com.mplauction.android.ui.auction

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.data.repository.AuctionRepository
import com.mplauction.android.data.repository.NewPlayer
import com.mplauction.android.data.repository.TeamRepository
import com.mplauction.android.data.repository.UserRepository
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
  val csvText: String = "",
  val importingCsv: Boolean = false,
  val importResult: String? = null,
  val registeredPlayerSearch: String = "",
  val registeredPlayers: List<AppUser> = emptyList(),
  val registeredBasePrices: Map<String, String> = emptyMap(),
  val addingRegisteredPlayerIds: Set<String> = emptySet(),
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
  private val userRepository: UserRepository,
  private val auctionId: String,
) : ViewModel() {
  private val playerNameState = MutableStateFlow("")
  private val playerPositionState = MutableStateFlow("")
  private val playerBasePriceState = MutableStateFlow("1000")
  private val addingPlayerState = MutableStateFlow(false)
  private val csvTextState = MutableStateFlow("")
  private val importingCsvState = MutableStateFlow(false)
  private val importResultState = MutableStateFlow<String?>(null)
  private val registeredSearchState = MutableStateFlow("")
  private val registeredBasePricesState = MutableStateFlow<Map<String, String>>(emptyMap())
  private val addingRegisteredPlayerIdsState = MutableStateFlow<Set<String>>(emptySet())
  private val purseState = MutableStateFlow("10000")
  private val maxPlayersState = MutableStateFlow("15")
  private val addingTeamState = MutableStateFlow(false)
  private val busyState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  private data class PlayerForm(val name: String, val position: String, val basePrice: String, val adding: Boolean)
  private data class CsvForm(val text: String, val importing: Boolean, val result: String?)
  private data class RegisteredForm(val search: String, val basePrices: Map<String, String>, val addingIds: Set<String>)
  private data class TeamForm(val purse: String, val maxPlayers: String, val adding: Boolean)
  private data class Forms(val player: PlayerForm, val csv: CsvForm, val team: TeamForm, val registered: RegisteredForm, val status: Pair<Boolean, String?>)

  private val playerForm =
    combine(playerNameState, playerPositionState, playerBasePriceState, addingPlayerState, ::PlayerForm)
  private val csvForm = combine(csvTextState, importingCsvState, importResultState, ::CsvForm)
  private val registeredForm = combine(registeredSearchState, registeredBasePricesState, addingRegisteredPlayerIdsState, ::RegisteredForm)
  private val teamForm = combine(purseState, maxPlayersState, addingTeamState, ::TeamForm)
  private val statusForm = combine(busyState, errorState) { busy, error -> busy to error }
  private val formsFlow = combine(playerForm, csvForm, teamForm, registeredForm, statusForm, ::Forms)

  val uiState: StateFlow<AuctionSetupUiState> =
    combine(
      auctionRepository.observeAuction(auctionId),
      teamRepository.observeTeams(),
      userRepository.observeUsers(),
      formsFlow,
    ) { auction, teams, users, forms ->
      val available = teams.filter { t -> auction?.teamManagers?.none { it.teamId == t.teamId } != false }
      val rosterUids = auction?.players?.map { it.playerId }?.toSet() ?: emptySet()
      val rQuery = forms.registered.search.trim().lowercase()
      val registeredPlayers =
        users.filter { it.role == UserRole.player && it.uid !in rosterUids }
          .filter { u ->
            rQuery.isEmpty() ||
              u.displayName.lowercase().contains(rQuery) ||
              u.email.lowercase().contains(rQuery) ||
              u.phone.contains(rQuery) ||
              u.userCode?.lowercase()?.contains(rQuery) == true
          }
      AuctionSetupUiState(
        auction = auction,
        availableTeams = available,
        playerName = forms.player.name,
        playerPosition = forms.player.position,
        playerBasePrice = forms.player.basePrice,
        addingPlayer = forms.player.adding,
        csvText = forms.csv.text,
        importingCsv = forms.csv.importing,
        importResult = forms.csv.result,
        registeredPlayerSearch = forms.registered.search,
        registeredPlayers = registeredPlayers,
        registeredBasePrices = forms.registered.basePrices,
        addingRegisteredPlayerIds = forms.registered.addingIds,
        purse = forms.team.purse,
        maxPlayers = forms.team.maxPlayers,
        addingTeam = forms.team.adding,
        busy = forms.status.first,
        error = forms.status.second,
      )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AuctionSetupUiState())

  fun onPlayerNameChanged(v: String) { playerNameState.value = v }
  fun onPlayerPositionChanged(v: String) { playerPositionState.value = v }
  fun onPlayerBasePriceChanged(v: String) { playerBasePriceState.value = v }
  fun onCsvTextChanged(v: String) { csvTextState.value = v; importResultState.value = null }
  fun onRegisteredSearchChanged(v: String) { registeredSearchState.value = v }
  fun onRegisteredBasePriceChanged(uid: String, v: String) { registeredBasePricesState.value = registeredBasePricesState.value + (uid to v) }
  fun onPurseChanged(v: String) { purseState.value = v }
  fun onMaxPlayersChanged(v: String) { maxPlayersState.value = v }

  // Port of parseCsv in AuctionSetup.tsx: "name,position,basePrice" per
  // line — position/basePrice are optional, a line with no name (e.g. a
  // leading comma, or a pasted header row) is dropped rather than added as
  // a blank player.
  private fun parseCsv(text: String): List<NewPlayer> =
    text.split("\n")
      .map { it.trim() }
      .filter { it.isNotEmpty() }
      .mapNotNull { line ->
        val parts = line.split(",").map { it.trim() }
        val name = parts.getOrNull(0).orEmpty()
        if (name.isEmpty()) return@mapNotNull null
        NewPlayer(name = name, position = parts.getOrNull(1).orEmpty(), basePrice = parts.getOrNull(2)?.toLongOrNull() ?: 0L)
      }

  fun importCsv() {
    val text = csvTextState.value
    if (text.isBlank() || importingCsvState.value) return
    val totalLines = text.split("\n").count { it.trim().isNotEmpty() }
    val players = parseCsv(text)
    if (players.isEmpty()) {
      importResultState.value = "No valid rows found — each line needs at least a name before the first comma."
      return
    }
    importingCsvState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        auctionRepository.addPlayers(auctionId, players)
        csvTextState.value = ""
        val skipped = totalLines - players.size
        importResultState.value =
          "Imported ${players.size} player${if (players.size == 1) "" else "s"}" +
            if (skipped > 0) " — skipped $skipped line${if (skipped == 1) "" else "s"} with no name." else "."
      } catch (e: Exception) {
        errorState.value = e.message ?: "Failed to import players"
      } finally {
        importingCsvState.value = false
      }
    }
  }

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

  fun addRegisteredPlayer(user: AppUser) {
    if (user.uid in addingRegisteredPlayerIdsState.value) return
    val basePrice = registeredBasePricesState.value[user.uid]?.toLongOrNull() ?: 0L
    addingRegisteredPlayerIdsState.value = addingRegisteredPlayerIdsState.value + user.uid
    errorState.value = null
    viewModelScope.launch {
      try {
        auctionRepository.addRegisteredPlayer(auctionId, user, basePrice)
        // So the player can see this auction (and what's happening in it)
        // from their own Home page once they log in — mirrors how Team
        // Managers and Auction Managers already see their assigned auctions.
        userRepository.assignUserToAuction(user.uid, auctionId, user.assignedAuctions, UserRole.player)
        registeredBasePricesState.value = registeredBasePricesState.value - user.uid
      } catch (e: Exception) {
        errorState.value = e.message ?: "Failed to add ${user.displayName}"
      } finally {
        addingRegisteredPlayerIdsState.value = addingRegisteredPlayerIdsState.value - user.uid
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
