package com.mplauction.android.ui.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginUiState(val loading: Boolean = false, val error: String? = null)

class LoginViewModel(private val authRepository: AuthRepository) : ViewModel() {
  private val _uiState = MutableStateFlow(LoginUiState())
  val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

  fun signIn(activityContext: Context) {
    if (_uiState.value.loading) return
    _uiState.value = LoginUiState(loading = true)
    viewModelScope.launch {
      try {
        authRepository.signInWithGoogle(activityContext)
        // Success flows through SessionViewModel's authState listener — no
        // explicit navigation call needed here.
        _uiState.value = LoginUiState(loading = false)
      } catch (e: Exception) {
        _uiState.value = LoginUiState(loading = false, error = e.message ?: "Sign-in failed")
      }
    }
  }
}
