package com.mplauction.android.ui.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
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
  val careerStats by remember(user.uid) { container.playerStatsRepository.observePlayerStats(user.uid) }.collectAsStateWithLifecycle(initialValue = null)
  var editing by remember { mutableStateOf(false) }
  fun resetToSaved() = viewModel.reset(user.displayName, user.phone, user.whatsapp, user.location)

  // A successful save closes the dialog; `user` is live (AuthRepository
  // listens to the users doc), so the read-only view updates on its own.
  LaunchedEffect(uiState.savedAt) { if (uiState.savedAt > 0) editing = false }

  Column(
    modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    PlayerAvatar(user.photoURL, user.avatarId, user.displayName, size = 88.dp)
    Row(verticalAlignment = Alignment.CenterVertically) {
      Text(user.displayName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
      IconButton(onClick = { resetToSaved(); editing = true }) { Icon(Icons.Filled.Edit, contentDescription = "Edit profile") }
    }
    Text(user.email, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Text("Role: ${user.role.name}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    user.userCode?.let {
      Text("User code: $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    Card(Modifier.fillMaxWidth()) {
      Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        ProfileDetail("Phone", user.phone)
        ProfileDetail("WhatsApp", user.whatsapp)
        ProfileDetail("Location", user.location)
      }
    }
    careerStats?.let { CareerStatsCard(it) }

    Button(onClick = onSignOut, modifier = Modifier.padding(top = 16.dp)) { Text("Sign out") }
  }

  if (editing) {
    AlertDialog(
      onDismissRequest = { if (!uiState.saving) editing = false },
      title = { Text("Edit profile") },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          ProfileField("Display name", uiState.displayName) { viewModel.onFieldChanged(displayName = it) }
          ProfileField("Phone", uiState.phone, KeyboardType.Phone) { viewModel.onFieldChanged(phone = it) }
          ProfileField("WhatsApp", uiState.whatsapp, KeyboardType.Phone) { viewModel.onFieldChanged(whatsapp = it) }
          ProfileField("Location", uiState.location) { viewModel.onFieldChanged(location = it) }
          uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
      },
      confirmButton = {
        TextButton(onClick = { viewModel.save(user.uid) }, enabled = !uiState.saving && uiState.displayName.isNotBlank()) {
          Text(if (uiState.saving) "Saving..." else "Save changes")
        }
      },
      dismissButton = {
        TextButton(onClick = { resetToSaved(); editing = false }, enabled = !uiState.saving) { Text("Cancel") }
      },
    )
  }
}

@Composable
private fun ProfileDetail(label: String, value: String) {
  Row(Modifier.fillMaxWidth()) {
    Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
    Text(value.ifBlank { "Not set" }, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
  }
}

@Composable
private fun ProfileField(label: String, value: String, keyboardType: KeyboardType = KeyboardType.Text, onChange: (String) -> Unit) {
  OutlinedTextField(
    value = value,
    onValueChange = onChange,
    label = { Text(label) },
    singleLine = true,
    keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
    modifier = Modifier.fillMaxWidth(),
  )
}
