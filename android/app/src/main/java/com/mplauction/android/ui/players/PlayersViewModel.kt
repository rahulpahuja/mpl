package com.mplauction.android.ui.players

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.data.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class PlayersUiState(
  val players: List<AppUser> = emptyList(),
  val pendingRequests: List<AppUser> = emptyList(),
  val viewerCandidates: List<AppUser> = emptyList(),
  val search: String = "",
  val viewerSearch: String = "",
  val promoting: Boolean = false,
)

// Port of AdminPlayers.tsx: the registered-player list (role == 'player')
// plus promoting a viewer to player, including approving a self-requested
// promotion (playerRequested == true).
class PlayersViewModel(private val userRepository: UserRepository) : ViewModel() {
  private val searchState = MutableStateFlow("")
  private val viewerSearchState = MutableStateFlow("")
  private val promotingState = MutableStateFlow(false)

  val uiState: StateFlow<PlayersUiState> =
    combine(userRepository.observeUsers(), searchState, viewerSearchState, promotingState) { users, search, viewerSearch, promoting ->
      val q = search.trim().lowercase()
      val vq = viewerSearch.trim().lowercase()
      PlayersUiState(
        players = users.filter { it.role == UserRole.player && matches(it, q) },
        pendingRequests = users.filter { it.role == UserRole.viewer && it.playerRequested == true },
        viewerCandidates = users.filter { it.role == UserRole.viewer && matches(it, vq) },
        search = search,
        viewerSearch = viewerSearch,
        promoting = promoting,
      )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), PlayersUiState())

  private fun matches(u: AppUser, q: String): Boolean =
    q.isEmpty() || u.displayName.lowercase().contains(q) || u.email.lowercase().contains(q) || u.phone.contains(q)

  fun onSearchChanged(v: String) { searchState.value = v }
  fun onViewerSearchChanged(v: String) { viewerSearchState.value = v }

  fun promote(uid: String) {
    if (promotingState.value) return
    promotingState.value = true
    viewModelScope.launch {
      try {
        userRepository.promoteViewerToPlayer(uid)
        viewerSearchState.value = ""
      } finally {
        promotingState.value = false
      }
    }
  }
}
