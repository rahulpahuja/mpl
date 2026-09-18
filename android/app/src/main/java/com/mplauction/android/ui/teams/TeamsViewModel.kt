package com.mplauction.android.ui.teams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.repository.TeamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class TeamsUiState(
  val loading: Boolean = true,
  val teams: List<Team> = emptyList(),
  val name: String = "",
  val managerCode: String = "",
  val jerseyColor: String = "",
  val creating: Boolean = false,
  val error: String? = null,
)

// Port of the list/create paths in AdminTeams.tsx + lib/teams.ts. The
// `teams` collection is only listable by Admin/Auction Manager per
// firestore.rules (see TeamRepository's doc comment) — a captain sees an
// empty list here rather than a crash, and the screen explains why.
class TeamsViewModel(private val teamRepository: TeamRepository) : ViewModel() {
  private val nameState = MutableStateFlow("")
  private val codeState = MutableStateFlow("")
  private val colorState = MutableStateFlow("")
  private val creatingState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  private data class FormState(val name: String, val code: String, val color: String, val creating: Boolean, val error: String?)

  private val form = combine(nameState, codeState, colorState, creatingState) { name, code, color, creating ->
    Triple(name, code, color) to creating
  }.combine(errorState) { (fields, creating), error -> FormState(fields.first, fields.second, fields.third, creating, error) }

  val uiState: StateFlow<TeamsUiState> =
    combine(teamRepository.observeTeams(), form) { teams, f ->
      TeamsUiState(loading = false, teams = teams, name = f.name, managerCode = f.code, jerseyColor = f.color, creating = f.creating, error = f.error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TeamsUiState())

  fun onNameChanged(v: String) { nameState.value = v }
  fun onCodeChanged(v: String) { codeState.value = v }
  fun onColorChanged(v: String) { colorState.value = v }

  fun clearForm() {
    nameState.value = ""
    codeState.value = ""
    colorState.value = ""
    errorState.value = null
  }

  fun createTeam(onCreated: () -> Unit) {
    val name = nameState.value.trim()
    val code = codeState.value.trim()
    if (name.isEmpty() || code.isEmpty() || creatingState.value) return
    creatingState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        val manager = teamRepository.findUserByCode(code) ?: throw IllegalStateException("No user found with code $code")
        teamRepository.createTeam(name, manager.uid, manager.displayName, colorState.value.trim().ifBlank { null })
        clearForm()
        onCreated()
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't create the team"
      } finally {
        creatingState.value = false
      }
    }
  }
}
