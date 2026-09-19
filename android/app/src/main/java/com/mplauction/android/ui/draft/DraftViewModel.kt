package com.mplauction.android.ui.draft

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.DraftMatch
import com.mplauction.android.data.model.DraftMatchPlayer
import com.mplauction.android.data.repository.DraftMatchRepository
import com.mplauction.android.data.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

// Backs one open DraftScreen. Unlike the original single-device demo, every
// mutation goes through DraftMatchRepository and is observed back via
// Firestore — this ViewModel is a thin reactive wrapper (same shape as
// AuctionSetupViewModel/BiddingRoomViewModel) plus the lobby's ephemeral
// search/add-player form state.
class DraftViewModel(
  private val repository: DraftMatchRepository,
  private val userRepository: UserRepository,
  private val matchId: String,
  private val myUser: AppUser,
) : ViewModel() {
  private val registeredSearchState = MutableStateFlow("")
  private val addingRegisteredIdsState = MutableStateFlow<Set<String>>(emptySet())
  private val manualNameState = MutableStateFlow("")
  private val manualPhoneState = MutableStateFlow("")
  private val manualEmailState = MutableStateFlow("")
  private val addingManualState = MutableStateFlow(false)
  private val joiningState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  private data class RegisteredForm(val search: String, val addingIds: Set<String>)
  private data class ManualForm(val name: String, val phone: String, val email: String, val adding: Boolean)
  private data class StatusForm(val joining: Boolean, val error: String?)

  private val registeredForm = combine(registeredSearchState, addingRegisteredIdsState, ::RegisteredForm)
  private val manualForm = combine(manualNameState, manualPhoneState, manualEmailState, addingManualState, ::ManualForm)
  private val statusForm = combine(joiningState, errorState, ::StatusForm)

  val uiState: StateFlow<DraftUiState> =
    combine(repository.observeMatch(matchId), userRepository.observeUsers(), registeredForm, manualForm, statusForm) {
        match, users, registered, manual, status ->
      buildUiState(match, users, registered, manual, status)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DraftUiState(myUid = myUser.uid))

  private fun buildUiState(match: DraftMatch?, users: List<AppUser>, registered: RegisteredForm, manual: ManualForm, status: StatusForm): DraftUiState {
    if (match == null) return DraftUiState(loading = false, found = false, myUid = myUser.uid, error = status.error)

    val roster = match.players.map { it.toDraftPlayer() }
    val rosterIds = match.players.map { it.playerId }.toSet()
    val query = registered.search.trim().lowercase()
    val candidates =
      // Anyone signed in can be added to a casual match, not only the
      // Player role (which is about being up for auction).
      users.filter { it.uid !in rosterIds }
        .filter { u ->
          query.isEmpty() ||
            u.displayName.lowercase().contains(query) ||
            u.email.lowercase().contains(query) ||
            u.phone.contains(query) ||
            u.userCode?.lowercase()?.contains(query) == true
        }
    val teams =
      match.teams.map { t ->
        val captain = roster.find { it.id == t.captainId } ?: DraftPlayer(id = t.captainId, name = "?")
        DraftTeam(captain, t.name, t.playerIds.mapNotNull { id -> roster.find { it.id == id } })
      }
    val pool = match.pool.mapNotNull { id -> roster.find { it.id == id } }
    val lastPick =
      match.lastPick?.let { p -> roster.find { it.id == p.playerId }?.let { player -> DraftPickEvent(player, p.teamIndex.toInt(), p.auto, p.at) } }

    return DraftUiState(
      loading = false,
      found = true,
      matchId = match.matchId,
      matchName = match.name,
      hostUid = match.hostUid,
      hostName = match.hostName,
      myUid = myUser.uid,
      phase = match.status,
      roster = roster,
      joinedUids = match.joinedUids.toSet(),
      captainIds = match.captainIds,
      teams = teams,
      pool = pool,
      turnIndex = match.turnIndex.toInt(),
      timerEndsAtMillis = match.timerEndsAt?.toDate()?.time,
      turnSeconds = match.turnSeconds.toInt(),
      lastPick = lastPick,
      joining = status.joining,
      registeredSearch = registered.search,
      registeredCandidates = candidates,
      addingRegisteredIds = registered.addingIds,
      manualName = manual.name,
      manualPhone = manual.phone,
      manualEmail = manual.email,
      addingManual = manual.adding,
      error = status.error,
    )
  }

  private fun DraftMatchPlayer.toDraftPlayer() =
    DraftPlayer(id = playerId, name = name, uid = uid, avatarId = avatarId, photoURL = photoURL, phone = phone, email = email, role = role)

  fun joinMatch() {
    if (joiningState.value) return
    joiningState.value = true
    viewModelScope.launch {
      try {
        repository.joinMatch(matchId, myUser)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't join this match"
      } finally {
        joiningState.value = false
      }
    }
  }

  fun onRegisteredSearchChanged(v: String) { registeredSearchState.value = v }
  fun onManualNameChanged(v: String) { manualNameState.value = v }
  fun onManualPhoneChanged(v: String) { manualPhoneState.value = v }
  fun onManualEmailChanged(v: String) { manualEmailState.value = v }

  fun addRegisteredPlayer(user: AppUser) {
    if (user.uid in addingRegisteredIdsState.value) return
    addingRegisteredIdsState.value = addingRegisteredIdsState.value + user.uid
    viewModelScope.launch {
      try {
        repository.addRegisteredPlayer(matchId, user)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Failed to add ${user.displayName}"
      } finally {
        addingRegisteredIdsState.value = addingRegisteredIdsState.value - user.uid
      }
    }
  }

  fun addManualPlayer() {
    val name = manualNameState.value.trim()
    if (name.isEmpty() || addingManualState.value) return
    addingManualState.value = true
    viewModelScope.launch {
      try {
        repository.addManualPlayer(matchId, name, manualPhoneState.value.trim(), manualEmailState.value.trim())
        manualNameState.value = ""
        manualPhoneState.value = ""
        manualEmailState.value = ""
      } catch (e: Exception) {
        errorState.value = e.message ?: "Failed to add $name"
      } finally {
        addingManualState.value = false
      }
    }
  }

  fun removePlayer(playerId: String) {
    viewModelScope.launch { runCatching { repository.removePlayer(matchId, playerId) } }
  }

  fun toggleCaptain(player: DraftPlayer) {
    val current = uiState.value.captainIds
    val next =
      when {
        player.id in current -> current - player.id
        current.size < 2 -> current + player.id
        else -> return
      }
    viewModelScope.launch { runCatching { repository.setCaptains(matchId, next) } }
  }

  fun randomizeCaptains() {
    val roster = uiState.value.roster
    if (roster.size < MIN_DRAFT_PLAYERS) return
    viewModelScope.launch { runCatching { repository.setCaptains(matchId, roster.shuffled().take(2).map { it.id }) } }
  }

  fun confirmCaptains() {
    if (!uiState.value.canStartDraft) return
    viewModelScope.launch { runCatching { repository.confirmCaptains(matchId) } }
  }

  // Called by every client's reveal screen after its own local animation
  // finishes — safe to call more than once (see beginDrafting's guard in
  // DraftMatchRepository), so whichever client gets there first wins.
  fun ensureDraftingStarted() {
    viewModelScope.launch { runCatching { repository.beginDrafting(matchId) } }
  }

  fun pickPlayer(player: DraftPlayer) {
    if (!uiState.value.canIPick) return
    viewModelScope.launch { runCatching { repository.pickPlayer(matchId, player.id) } }
  }

  fun autoPickIfExpired() {
    viewModelScope.launch { runCatching { repository.autoPickIfExpired(matchId) } }
  }
}
