package com.mplauction.android.ui.players

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.ui.common.PlayerAvatar

@Composable
fun PlayersScreen(modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: PlayersViewModel = viewModel(key = "players") { PlayersViewModel(container.userRepository) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
    item {
      OutlinedTextField(
        value = uiState.search,
        onValueChange = viewModel::onSearchChanged,
        label = { Text("Search players") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
    }
    items(uiState.players, key = { it.uid }) { player -> PlayerRow(player, modifier = Modifier.animateItem()) }
    if (uiState.players.isEmpty()) item { Text("No registered players yet.", style = MaterialTheme.typography.bodyMedium) }

    item { Text("Promote a viewer to player", style = MaterialTheme.typography.titleSmall) }
    if (uiState.pendingRequests.isNotEmpty()) {
      item { Text("Requested", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
      items(uiState.pendingRequests, key = { "req-${it.uid}" }) { viewer ->
        Card(modifier = Modifier.fillMaxWidth()) {
          Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(viewer.displayName)
            Button(onClick = { viewModel.promote(viewer.uid) }, enabled = !uiState.promoting) { Text("Approve") }
          }
        }
      }
    }
    item {
      OutlinedTextField(
        value = uiState.viewerSearch,
        onValueChange = viewModel::onViewerSearchChanged,
        label = { Text("Search viewers by name/email/phone") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
    }
    if (uiState.viewerSearch.isNotBlank()) {
      items(uiState.viewerCandidates, key = { "cand-${it.uid}" }) { viewer ->
        Card(modifier = Modifier.fillMaxWidth()) {
          Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(viewer.displayName)
            Button(onClick = { viewModel.promote(viewer.uid) }, enabled = !uiState.promoting) { Text("Promote") }
          }
        }
      }
      if (uiState.viewerCandidates.isEmpty()) item { Text("No viewers match.", style = MaterialTheme.typography.bodyMedium) }
    }
  }
}

@Composable
private fun PlayerRow(player: AppUser, modifier: Modifier = Modifier) {
  Card(modifier = modifier.fillMaxWidth()) {
    Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      PlayerAvatar(player.photoURL, player.avatarId, player.displayName)
      Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
          Text(player.displayName, style = MaterialTheme.typography.bodyLarge)
          if (player.assignedAuctions.isNotEmpty()) SuggestionChip(onClick = {}, label = { Text("${player.assignedAuctions.size} auctions") })
        }
        Text(
          player.phone.ifBlank { player.email },
          style = MaterialTheme.typography.bodySmall,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }
  }
}
