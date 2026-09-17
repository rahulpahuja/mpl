package com.mplauction.android.ui.teams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.RosterPlayer
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.repository.TeamRepository
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class TeamDetailUiState(
  val team: Team? = null,
  val newPlayerName: String = "",
  val adding: Boolean = false,
  val error: String? = null,
)

// Port of the roster-editing path in lib/teams.ts (addToRoster/
// removeFromRoster) — manual name entry only; the web app's
// search-and-add-a-registered-player flow isn't ported this pass.
class TeamDetailViewModel(private val teamRepository: TeamRepository, private val teamId: String) : ViewModel() {
  private val nameState = MutableStateFlow("")
  private val addingState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  val uiState: StateFlow<TeamDetailUiState> =
    combine(teamRepository.observeTeam(teamId), nameState, addingState, errorState) { team, name, adding, error ->
      TeamDetailUiState(team = team, newPlayerName = name, adding = adding, error = error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TeamDetailUiState())

  fun onNameChanged(v: String) { nameState.value = v }

  fun addPlayer() {
    val name = nameState.value.trim()
    if (name.isEmpty() || addingState.value) return
    addingState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        teamRepository.addToRoster(teamId, RosterPlayer(playerId = UUID.randomUUID().toString(), name = name, isRegisteredUser = false))
        nameState.value = ""
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't add that player"
      } finally {
        addingState.value = false
      }
    }
  }

  fun removePlayer(playerId: String) {
    viewModelScope.launch {
      try {
        teamRepository.removeFromRoster(teamId, playerId)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't remove that player"
      }
    }
  }
}
