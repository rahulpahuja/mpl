package com.mplauction.android.ui.draft

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.PLAYING_ROLE_LABELS
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.ui.common.PlayerAvatar

// Pushed from the lobby's "Import players" button rather than inlined
// there — searching the platform's whole player directory deserves its own
// focused screen instead of competing for scroll space with the roster and
// captain picks. "Done" (and the back arrow) both just pop back to the
// lobby, which reflects every add immediately since it's the same live
// match doc.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImportPlayersScreen(matchId: String, currentUser: AppUser, onDone: () -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: DraftViewModel =
    viewModel(key = "import-players-$matchId") { DraftViewModel(container.draftMatchRepository, container.userRepository, matchId, currentUser) }
  val state by viewModel.uiState.collectAsStateWithLifecycle()

  Scaffold(
    modifier = modifier,
    containerColor = Color(0xFF0B0F1A),
    topBar = {
      TopAppBar(
        title = { Text("Import players", color = Color.White) },
        navigationIcon = {
          IconButton(onClick = onDone) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White) }
        },
        actions = { TextButton(onClick = onDone) { Text("Done", color = Color.White) } },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
      )
    },
  ) { innerPadding ->
    Column(
      Modifier
        .fillMaxSize()
        .padding(innerPadding)
        .background(Color(0xFF0B0F1A))
        .verticalScroll(rememberScrollState())
        .padding(16.dp),
    ) {
      Text(
        "Search anyone signed in to Baato who isn't on this roster yet, by name, email, phone, or user code.",
        color = Color.White.copy(alpha = 0.6f),
        style = MaterialTheme.typography.bodyMedium,
      )
      OutlinedTextField(
        value = state.registeredSearch,
        onValueChange = viewModel::onRegisteredSearchChanged,
        label = { Text("Search by name, email, phone, or user code") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
      )
      if (state.registeredCandidates.isEmpty()) {
        Text(
          if (state.registeredSearch.isBlank()) "No registered players available to add." else "No players match.",
          color = Color.White.copy(alpha = 0.5f),
          style = MaterialTheme.typography.bodySmall,
          modifier = Modifier.padding(top = 16.dp),
        )
      } else {
        Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
          state.registeredCandidates.forEach { user ->
            RegisteredCandidateRow(user, adding = user.uid in state.addingRegisteredIds, onAdd = { viewModel.addRegisteredPlayer(user) })
          }
        }
      }
    }
  }
}

@Composable
private fun RegisteredCandidateRow(user: AppUser, adding: Boolean, onAdd: () -> Unit) {
  Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
    PlayerAvatar(photoURL = user.photoURL, avatarId = user.avatarId, name = user.displayName, size = 36.dp)
    Column(Modifier.weight(1f)) {
      Text(user.displayName, color = Color.White, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
      user.playingRole?.let { role ->
        PLAYING_ROLE_LABELS[role]?.let { Text(it, color = Color.White.copy(alpha = 0.5f), style = MaterialTheme.typography.labelSmall) }
      }
    }
    TextButton(onClick = onAdd, enabled = !adding) { Text(if (adding) "Adding..." else "Add") }
  }
}
