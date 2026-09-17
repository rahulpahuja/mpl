package com.mplauction.android.ui.profile

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.ui.common.PlayerAvatar

@Composable
fun ProfileScreen(user: AppUser, onSignOut: () -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: ProfileViewModel =
    viewModel(key = "profile-${user.uid}") {
      ProfileViewModel(
        container.userRepository,
        ProfileEditState(displayName = user.displayName, phone = user.phone, whatsapp = user.whatsapp, location = user.location),
      )
    }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val savedRecently = remember(uiState.savedAt) { uiState.savedAt > 0 && System.currentTimeMillis() - uiState.savedAt < 3000 }

  // Scrollable: the avatar + four fields + two buttons overflow a phone
  // screen, and without this the last button renders under the navigation
  // bar with its label sliced in half.
  Column(
    modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    PlayerAvatar(user.photoURL, user.avatarId, user.displayName, size = 88.dp)
    Text(user.email, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Text("Role: ${user.role.name}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    user.userCode?.let {
      Text("User code: $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }

    OutlinedTextField(
      value = uiState.displayName,
      onValueChange = { viewModel.onFieldChanged(displayName = it) },
      label = { Text("Display name") },
      singleLine = true,
      modifier = Modifier.fillMaxWidth(),
    )
    OutlinedTextField(
      value = uiState.phone,
      onValueChange = { viewModel.onFieldChanged(phone = it) },
      label = { Text("Phone") },
      singleLine = true,
      modifier = Modifier.fillMaxWidth(),
    )
    OutlinedTextField(
      value = uiState.whatsapp,
      onValueChange = { viewModel.onFieldChanged(whatsapp = it) },
      label = { Text("WhatsApp") },
      singleLine = true,
      modifier = Modifier.fillMaxWidth(),
    )
    OutlinedTextField(
      value = uiState.location,
      onValueChange = { viewModel.onFieldChanged(location = it) },
      label = { Text("Location") },
      singleLine = true,
      modifier = Modifier.fillMaxWidth(),
    )

    Button(onClick = { viewModel.save(user.uid) }, enabled = !uiState.saving && uiState.displayName.isNotBlank()) {
      Text(if (uiState.saving) "Saving..." else "Save changes")
    }
    AnimatedVisibility(visible = savedRecently) {
      Text("Saved.", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
    }
    uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

    Button(onClick = onSignOut, modifier = Modifier.padding(top = 16.dp)) { Text("Sign out") }
  }
}
