package com.mplauction.android.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.repository.AuthRepository
import com.mplauction.android.data.repository.AuthState
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

// Root-level auth session, watched by MplNavigation to decide whether the
// back stack starts at Login or Home, and re-evaluated live so a role change
// (e.g. an Admin promoting this user from the web app) updates the app
// without a restart.
class SessionViewModel(authRepository: AuthRepository) : ViewModel() {
  val authState: StateFlow<AuthState> =
    authRepository
      .authState()
      .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AuthState.Loading)
}
