package com.mplauction.android.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.repository.BootstrapRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ClaimAdminUiState(val claiming: Boolean = false, val error: String? = null, val claimed: Boolean = false)

class ClaimAdminViewModel(private val bootstrapRepository: BootstrapRepository) : ViewModel() {
  private val _uiState = MutableStateFlow(ClaimAdminUiState())
  val uiState: StateFlow<ClaimAdminUiState> = _uiState.asStateFlow()

  fun claim(uid: String) {
    if (_uiState.value.claiming) return
    _uiState.value = ClaimAdminUiState(claiming = true)
    viewModelScope.launch {
      try {
        bootstrapRepository.claimFirstAdmin(uid)
        _uiState.value = ClaimAdminUiState(claimed = true)
      } catch (e: Exception) {
        _uiState.value = ClaimAdminUiState(error = e.message ?: "Failed to claim admin access")
      }
    }
  }
}
