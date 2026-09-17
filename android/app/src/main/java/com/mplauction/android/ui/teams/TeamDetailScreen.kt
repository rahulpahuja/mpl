package com.mplauction.android.ui.teams

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.RosterPlayer
import com.mplauction.android.ui.common.PlayerAvatar
import com.mplauction.android.ui.common.TeamAvatar

@Composable
fun TeamDetailScreen(teamId: String, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: TeamDetailViewModel = viewModel(key = "team-$teamId") { TeamDetailViewModel(container.teamRepository, teamId) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val team = uiState.team

  if (team == null) {
    Column(modifier.fillMaxWidth().padding(24.dp)) { CircularProgressIndicator() }
    return
  }

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
    item {
      Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        TeamAvatar(team.logoImage, team.logoId, team.teamName, size = 64.dp)
        Column {
          Text(team.teamName, style = MaterialTheme.typography.headlineSmall)
          Text("Captain: ${team.managerName}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
      }
    }
    item {
      Card {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Text("Add to roster", style = MaterialTheme.typography.titleSmall)
          Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
              value = uiState.newPlayerName,
              onValueChange = viewModel::onNameChanged,
              label = { Text("Player name") },
              singleLine = true,
              modifier = Modifier.weight(1f),
            )
            Button(onClick = viewModel::addPlayer, enabled = !uiState.adding && uiState.newPlayerName.isNotBlank()) {
              Text(if (uiState.adding) "Adding..." else "Add")
            }
          }
          uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
      }
    }
    item { Text("Roster (${team.roster.size})", style = MaterialTheme.typography.titleSmall) }
    items(team.roster, key = { it.playerId }) { player ->
      RosterRow(player, onRemove = { viewModel.removePlayer(player.playerId) }, modifier = Modifier.animateItem())
    }
    if (team.roster.isEmpty()) {
      item { Text("No players on the roster yet.", style = MaterialTheme.typography.bodyMedium) }
    }
  }
}

@Composable
private fun RosterRow(player: RosterPlayer, onRemove: () -> Unit, modifier: Modifier = Modifier) {
  Card(modifier = modifier.fillMaxWidth()) {
    Row(
      Modifier.padding(12.dp).fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        PlayerAvatar(player.photoURL, player.avatarId, player.name, size = 36.dp)
        Text(player.name, style = MaterialTheme.typography.bodyLarge)
      }
      IconButton(onClick = onRemove) { Icon(Icons.Filled.Close, contentDescription = "Remove ${player.name}") }
    }
  }
}
