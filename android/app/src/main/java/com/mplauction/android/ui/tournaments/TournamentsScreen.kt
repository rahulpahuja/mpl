package com.mplauction.android.ui.tournaments

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import com.mplauction.android.data.model.Tournament

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TournamentsScreen(currentUserUid: String, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: TournamentsViewModel =
    viewModel(key = "tournaments") { TournamentsViewModel(container.tournamentRepository, container.teamRepository, currentUserUid) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
    item { CreateTournamentCard(uiState, viewModel) }
    if (uiState.tournaments.isEmpty()) item { Text("No tournaments yet.", style = MaterialTheme.typography.bodyMedium) }
    items(uiState.tournaments, key = { it.tournamentId }) { tournament -> TournamentCard(tournament, modifier = Modifier.animateItem()) }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateTournamentCard(uiState: TournamentsUiState, viewModel: TournamentsViewModel) {
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Create a tournament", style = MaterialTheme.typography.titleSmall)
      OutlinedTextField(
        value = uiState.name,
        onValueChange = viewModel::onNameChanged,
        label = { Text("Tournament name") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      Text("Teams", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
      FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        uiState.teams.forEach { team ->
          FilterChip(
            selected = team.teamId in uiState.selectedTeamIds,
            onClick = { viewModel.toggleTeam(team.teamId) },
            label = { Text(team.teamName) },
          )
        }
      }
      uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
      Button(onClick = viewModel::createTournament, enabled = !uiState.creating && uiState.name.isNotBlank()) {
        Text(if (uiState.creating) "Creating..." else "Create tournament")
      }
    }
  }
}

@Composable
private fun TournamentCard(tournament: Tournament, modifier: Modifier = Modifier) {
  Card(modifier = modifier.fillMaxWidth()) {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
      Text(tournament.name, style = MaterialTheme.typography.titleMedium)
      Text(
        "${tournament.teamIds.size} teams",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
    }
  }
}
