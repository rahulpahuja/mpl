package com.mplauction.android.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProfileEditState(
  val displayName: String,
  val phone: String,
  val whatsapp: String,
  val location: String,
  val saving: Boolean = false,
  val error: String? = null,
  val savedAt: Long = 0,
)

// Port of the identity/contact fields on Profile.tsx's edit form
// (updateOwnProfile in lib/users.ts) — cricket attributes aren't editable on
// Android yet (see UserRepository's doc comment).
class ProfileViewModel(private val userRepository: UserRepository, initial: ProfileEditState) : ViewModel() {
  private val _uiState = MutableStateFlow(initial)
  val uiState: StateFlow<ProfileEditState> = _uiState.asStateFlow()

  fun onFieldChanged(displayName: String? = null, phone: String? = null, whatsapp: String? = null, location: String? = null) {
    _uiState.value =
      _uiState.value.copy(
        displayName = displayName ?: _uiState.value.displayName,
        phone = phone ?: _uiState.value.phone,
        whatsapp = whatsapp ?: _uiState.value.whatsapp,
        location = location ?: _uiState.value.location,
      )
  }

  fun save(uid: String) {
    val state = _uiState.value
    if (state.saving || state.displayName.isBlank()) return
    _uiState.value = state.copy(saving = true, error = null)
    viewModelScope.launch {
      try {
        userRepository.updateOwnProfile(uid, state.displayName.trim(), state.phone.trim(), state.whatsapp.trim(), state.location.trim())
        _uiState.value = _uiState.value.copy(saving = false, savedAt = System.currentTimeMillis())
      } catch (e: Exception) {
        _uiState.value = _uiState.value.copy(saving = false, error = e.message ?: "Couldn't save your profile")
      }
    }
  }
}
