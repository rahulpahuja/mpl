package com.mplauction.android.ui.tournaments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.model.Tournament
import com.mplauction.android.data.repository.TeamRepository
import com.mplauction.android.data.repository.TournamentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class TournamentsUiState(
  val tournaments: List<Tournament> = emptyList(),
  val teams: List<Team> = emptyList(),
  val name: String = "",
  val selectedTeamIds: Set<String> = emptySet(),
  val creating: Boolean = false,
  val error: String? = null,
)

class TournamentsViewModel(
  private val tournamentRepository: TournamentRepository,
  private val teamRepository: TeamRepository,
  private val currentUserUid: String,
) : ViewModel() {
  private val nameState = MutableStateFlow("")
  private val selectedTeamIdsState = MutableStateFlow<Set<String>>(emptySet())
  private val creatingState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  private data class FormState(val name: String, val selected: Set<String>, val creating: Boolean, val error: String?)

  private val form =
    combine(nameState, selectedTeamIdsState, creatingState, errorState) { name, selected, creating, error ->
      FormState(name, selected, creating, error)
    }

  val uiState: StateFlow<TournamentsUiState> =
    combine(tournamentRepository.observeTournaments(), teamRepository.observeTeams(), form) { tournaments, teams, f ->
      TournamentsUiState(tournaments, teams, f.name, f.selected, f.creating, f.error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TournamentsUiState())

  fun onNameChanged(v: String) { nameState.value = v }

  fun toggleTeam(teamId: String) {
    selectedTeamIdsState.value =
      if (teamId in selectedTeamIdsState.value) selectedTeamIdsState.value - teamId else selectedTeamIdsState.value + teamId
  }

  fun createTournament() {
    val name = nameState.value.trim()
    if (name.isEmpty() || creatingState.value) return
    creatingState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        val teams = uiState.value.teams.filter { it.teamId in selectedTeamIdsState.value }
        tournamentRepository.createTournament(name, currentUserUid, teams)
        nameState.value = ""
        selectedTeamIdsState.value = emptySet()
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't create the tournament"
      } finally {
        creatingState.value = false
      }
    }
  }
}
