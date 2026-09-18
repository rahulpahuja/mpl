package com.mplauction.android.ui.draft

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.DraftMatch
import com.mplauction.android.data.model.DraftMatchStatus
import com.mplauction.android.data.repository.DraftMatchRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class MatchesListUiState(
  val matches: List<DraftMatch> = emptyList(),
  val newMatchName: String = "",
  val creating: Boolean = false,
  val joinId: String = "",
  val error: String? = null,
)

// Backs the Matches tab: browse draft matches that haven't finished yet
// (still in the lobby, or mid-draft), create a new one, or jump straight to
// one by ID. Long-pressing a match you host offers to delete it.
class MatchesListViewModel(private val repository: DraftMatchRepository, private val currentUser: AppUser) : ViewModel() {
  private val nameState = MutableStateFlow("")
  private val creatingState = MutableStateFlow(false)
  private val joinIdState = MutableStateFlow("")
  private val errorState = MutableStateFlow<String?>(null)

  val uiState: StateFlow<MatchesListUiState> =
    combine(repository.observeOpenMatches(), nameState, creatingState, joinIdState, errorState) { matches, name, creating, joinId, error ->
      MatchesListUiState(matches.filter { it.status != DraftMatchStatus.complete }, name, creating, joinId, error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), MatchesListUiState())

  fun onNameChanged(v: String) { nameState.value = v }
  fun onJoinIdChanged(v: String) { joinIdState.value = v.uppercase() }

  fun createMatch(onCreated: (String) -> Unit) {
    val name = nameState.value.trim()
    if (name.isEmpty() || creatingState.value) return
    creatingState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        val matchId = repository.createMatch(name, currentUser)
        nameState.value = ""
        onCreated(matchId)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't create that match"
      } finally {
        creatingState.value = false
      }
    }
  }

  fun deleteMatch(matchId: String) {
    viewModelScope.launch {
      try {
        repository.deleteMatch(matchId)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't delete that match"
      }
    }
  }
}
