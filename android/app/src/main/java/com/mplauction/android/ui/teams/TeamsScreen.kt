package com.mplauction.android.ui.teams

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.ui.common.TeamAvatar

@Composable
fun TeamsScreen(currentUser: AppUser, onOpenTeam: (Team) -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: TeamsViewModel = viewModel(key = "teams") { TeamsViewModel(container.teamRepository) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val canManage = currentUser.role == UserRole.admin || currentUser.role == UserRole.auctionManager
  var creating by remember { mutableStateOf(false) }

  Box(modifier) {
    LazyColumn(
      // Bottom padding keeps the last team clear of the FAB.
      contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 88.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
      modifier = Modifier.fillMaxSize(),
    ) {
      if (!canManage) {
        item {
          Text(
            "The team registry is only visible to Admins and Auction Managers. Your own team's " +
              "purse and roster show up inside that auction's bidding room instead.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
        }
      } else {
        if (!uiState.loading && uiState.teams.isEmpty()) {
          item { Text("No teams yet — tap + to create one.", style = MaterialTheme.typography.bodyMedium) }
        }
        items(uiState.teams, key = { it.teamId }) { team ->
          TeamCard(team, onClick = { onOpenTeam(team) }, modifier = Modifier.animateItem())
        }
      }
    }
    if (canManage) {
      FloatingActionButton(
        onClick = { viewModel.clearForm(); creating = true },
        modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
      ) {
        Icon(Icons.Filled.Add, contentDescription = "Create a team")
      }
    }
  }

  if (creating) {
    CreateTeamDialog(uiState, viewModel, onClose = { creating = false })
  }
}

@Composable
private fun CreateTeamDialog(uiState: TeamsUiState, viewModel: TeamsViewModel, onClose: () -> Unit) {
  AlertDialog(
    onDismissRequest = { if (!uiState.creating) onClose() },
    title = { Text("Create a team") },
    text = { CreateTeamForm(uiState, viewModel) },
    confirmButton = {
      TextButton(
        onClick = { viewModel.createTeam(onCreated = onClose) },
        enabled = !uiState.creating && uiState.name.isNotBlank() && uiState.managerCode.isNotBlank(),
      ) {
        Text(if (uiState.creating) "Saving..." else "Save")
      }
    },
    dismissButton = { TextButton(onClick = { viewModel.clearForm(); onClose() }, enabled = !uiState.creating) { Text("Cancel") } },
  )
}

@Composable
private fun CreateTeamForm(uiState: TeamsUiState, viewModel: TeamsViewModel) {
  Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
      OutlinedTextField(
        value = uiState.name,
        onValueChange = viewModel::onNameChanged,
        label = { Text("Team name") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      OutlinedTextField(
        value = uiState.managerCode,
        onValueChange = viewModel::onCodeChanged,
        label = { Text("Captain's user code") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      OutlinedTextField(
        value = uiState.jerseyColor,
        onValueChange = viewModel::onColorChanged,
        label = { Text("Jersey color (hex, optional)") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
  }
}

@Composable
private fun TeamCard(team: Team, onClick: () -> Unit, modifier: Modifier = Modifier) {
  Card(onClick = onClick, modifier = modifier.fillMaxWidth()) {
    Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      TeamAvatar(team.logoImage, team.logoId, team.teamName)
      Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(team.teamName, style = MaterialTheme.typography.titleMedium)
        Text("Captain: ${team.managerName}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("${team.roster.size} on roster", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
      }
    }
  }
}
