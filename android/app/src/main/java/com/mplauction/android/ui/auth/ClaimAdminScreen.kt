package com.mplauction.android.ui.auth

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser

// Port of BootstrapAdmin.tsx — the one-time first-admin claim flow.
@Composable
fun ClaimAdminScreen(user: AppUser, onClaimed: () -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: ClaimAdminViewModel = viewModel { ClaimAdminViewModel(container.bootstrapRepository) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()

  LaunchedEffect(uiState.claimed) { if (uiState.claimed) onClaimed() }

  Column(
    modifier = modifier.verticalScroll(rememberScrollState()).padding(24.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    Text("Set up the first Admin", style = MaterialTheme.typography.titleLarge)
    Text(
      "No admin has claimed this app yet. Since you're signed in as ${user.displayName}, you " +
        "can become the first Admin. This can only be done once — after this, only an existing " +
        "Admin can promote other users.",
      style = MaterialTheme.typography.bodyMedium,
    )
    Button(onClick = { viewModel.claim(user.uid) }, enabled = !uiState.claiming) {
      Text(if (uiState.claiming) "Claiming..." else "Claim admin access")
    }
    uiState.error?.let { Text(it, color = Color(0xFFDC2626), style = MaterialTheme.typography.bodySmall) }
  }
}
