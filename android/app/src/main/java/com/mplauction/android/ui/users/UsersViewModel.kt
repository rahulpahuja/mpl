package com.mplauction.android.ui.users

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.Invite
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.data.repository.AuctionRepository
import com.mplauction.android.data.repository.InviteRepository
import com.mplauction.android.data.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class UsersUiState(
  val users: List<AppUser> = emptyList(),
  val auctions: List<Auction> = emptyList(),
  val invites: List<Invite> = emptyList(),
  val search: String = "",
  val inviteEmail: String = "",
  val inviteRole: UserRole = UserRole.manager,
  val inviting: Boolean = false,
) {
  val filteredUsers: List<AppUser>
    get() {
      val q = search.trim().lowercase()
      if (q.isEmpty()) return users
      return users.filter { it.displayName.lowercase().contains(q) || it.email.lowercase().contains(q) || it.phone.contains(q) }
    }
}

// Port of AdminUsers.tsx: search + per-role grouping, role reassignment,
// auction assignment, and inviting someone by email before they've ever
// signed in.
class UsersViewModel(
  private val userRepository: UserRepository,
  private val inviteRepository: InviteRepository,
  auctionRepository: AuctionRepository,
) : ViewModel() {
  private val searchState = MutableStateFlow("")
  private val inviteEmailState = MutableStateFlow("")
  private val inviteRoleState = MutableStateFlow(UserRole.manager)
  private val invitingState = MutableStateFlow(false)

  private data class InviteForm(val email: String, val role: UserRole, val inviting: Boolean)
  private val inviteForm = combine(inviteEmailState, inviteRoleState, invitingState, ::InviteForm)

  val uiState: StateFlow<UsersUiState> =
    combine(
      userRepository.observeUsers(),
      auctionRepository.observeAuctions(),
      inviteRepository.observeInvites(),
      searchState,
      inviteForm,
    ) { users, auctions, invites, search, form ->
      UsersUiState(
        users = users,
        auctions = auctions,
        invites = invites,
        search = search,
        inviteEmail = form.email,
        inviteRole = form.role,
        inviting = form.inviting,
      )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), UsersUiState())

  fun onSearchChanged(v: String) { searchState.value = v }
  fun onInviteEmailChanged(v: String) { inviteEmailState.value = v }
  fun onInviteRoleChanged(v: UserRole) { inviteRoleState.value = v }

  fun sendInvite() {
    val email = inviteEmailState.value.trim()
    if (email.isEmpty() || invitingState.value) return
    invitingState.value = true
    viewModelScope.launch {
      try {
        inviteRepository.createInvite(email, inviteRoleState.value)
        inviteEmailState.value = ""
        inviteRoleState.value = UserRole.manager
      } finally {
        invitingState.value = false
      }
    }
  }

  fun cancelInvite(email: String) {
    viewModelScope.launch { inviteRepository.deleteInvite(email) }
  }

  fun updateRole(user: AppUser, role: UserRole) {
    viewModelScope.launch { userRepository.updateUserRole(user.uid, role) }
  }

  fun assignToAuction(user: AppUser, auctionId: String) {
    viewModelScope.launch { userRepository.assignUserToAuction(user.uid, auctionId, user.assignedAuctions, user.role) }
  }
}
