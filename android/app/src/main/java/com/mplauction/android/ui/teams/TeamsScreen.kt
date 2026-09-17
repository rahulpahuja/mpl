package com.mplauction.android.ui.teams

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
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.ui.common.TeamAvatar

@Composable
fun TeamsScreen(currentUser: AppUser, onOpenTeam: (Team) -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: TeamsViewModel = viewModel(key = "teams") { TeamsViewModel(container.teamRepository) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val canManage = currentUser.role == UserRole.admin || currentUser.role == UserRole.auctionManager

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
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
      item { CreateTeamCard(uiState, viewModel) }
      if (!uiState.loading && uiState.teams.isEmpty()) {
        item { Text("No teams yet.", style = MaterialTheme.typography.bodyMedium) }
      }
      items(uiState.teams, key = { it.teamId }) { team ->
        TeamCard(team, onClick = { onOpenTeam(team) }, modifier = Modifier.animateItem())
      }
    }
  }
}

@Composable
private fun CreateTeamCard(uiState: TeamsUiState, viewModel: TeamsViewModel) {
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Create a team", style = MaterialTheme.typography.titleSmall)
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
      Button(
        onClick = viewModel::createTeam,
        enabled = !uiState.creating && uiState.name.isNotBlank() && uiState.managerCode.isNotBlank(),
      ) {
        Text(if (uiState.creating) "Creating..." else "Create team")
      }
    }
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
