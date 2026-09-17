package com.mplauction.android.ui.auction

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.ui.common.auctionBackground
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.Team

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuctionSetupScreen(auctionId: String, onLive: () -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: AuctionSetupViewModel =
    viewModel(key = "setup-$auctionId") {
      AuctionSetupViewModel(container.auctionRepository, container.teamRepository, container.userRepository, auctionId)
    }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val auction = uiState.auction

  if (auction == null) {
    Column(modifier.fillMaxWidth().padding(24.dp)) { CircularProgressIndicator() }
    return
  }

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier.auctionBackground()) {
    item {
      Text("${auction.players.size} players · ${auction.teamManagers.size} teams", style = MaterialTheme.typography.bodyMedium)
    }
    item { AddTeamCard(uiState, viewModel) }
    item { AddPlayerCard(uiState, viewModel) }
    item { ImportPlayersCard(uiState, viewModel) }
    item { AddRegisteredPlayerCard(uiState, viewModel) }
    item { Text("Teams", style = MaterialTheme.typography.titleSmall) }
    items(auction.teamManagers, key = { it.teamId }) { tm ->
      Card(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Text(tm.name)
          Text("Purse ${tm.purse} · Max ${tm.maxPlayers}", style = MaterialTheme.typography.bodySmall)
        }
      }
    }
    item { Text("Players", style = MaterialTheme.typography.titleSmall) }
    items(auction.players, key = { it.playerId }) { p ->
      Card(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Text("${p.name}${if (p.position.isNotBlank()) " · ${p.position}" else ""}")
          Text("Base ${p.basePrice}", style = MaterialTheme.typography.bodySmall)
        }
      }
    }
    item {
      Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        Button(
          onClick = { viewModel.goLive(onLive) },
          enabled = !uiState.busy && auction.players.isNotEmpty() && auction.teamManagers.isNotEmpty(),
          modifier = Modifier.fillMaxWidth(),
        ) {
          Text(if (uiState.busy) "Starting..." else "Go live")
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddTeamCard(uiState: AuctionSetupUiState, viewModel: AuctionSetupViewModel) {
  var expanded by remember { mutableStateOf(false) }
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Add a team", style = MaterialTheme.typography.titleSmall)
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
          value = uiState.purse,
          onValueChange = viewModel::onPurseChanged,
          label = { Text("Purse") },
          singleLine = true,
          modifier = Modifier.weight(1f),
        )
        OutlinedTextField(
          value = uiState.maxPlayers,
          onValueChange = viewModel::onMaxPlayersChanged,
          label = { Text("Max players") },
          singleLine = true,
          modifier = Modifier.weight(1f),
        )
      }
      if (uiState.availableTeams.isEmpty()) {
        Text("No unassigned teams — create one from the Teams tab first.", style = MaterialTheme.typography.bodySmall)
      } else {
        Column {
          AssistChip(onClick = { expanded = true }, label = { Text("Pick a team to add") })
          DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            uiState.availableTeams.forEach { team: Team ->
              DropdownMenuItem(
                text = { Text(team.teamName) },
                onClick = {
                  expanded = false
                  viewModel.addTeam(team)
                },
              )
            }
          }
        }
      }
    }
  }
}

@Composable
private fun AddPlayerCard(uiState: AuctionSetupUiState, viewModel: AuctionSetupViewModel) {
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Add a player", style = MaterialTheme.typography.titleSmall)
      OutlinedTextField(
        value = uiState.playerName,
        onValueChange = viewModel::onPlayerNameChanged,
        label = { Text("Name") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
          value = uiState.playerPosition,
          onValueChange = viewModel::onPlayerPositionChanged,
          label = { Text("Position") },
          singleLine = true,
          modifier = Modifier.weight(1f),
        )
        OutlinedTextField(
          value = uiState.playerBasePrice,
          onValueChange = viewModel::onPlayerBasePriceChanged,
          label = { Text("Base price") },
          singleLine = true,
          modifier = Modifier.weight(1f),
        )
      }
      Button(onClick = viewModel::addPlayer, enabled = !uiState.addingPlayer && uiState.playerName.isNotBlank()) {
        Text(if (uiState.addingPlayer) "Adding..." else "Add player")
      }
    }
  }
}

@Composable
private fun ImportPlayersCard(uiState: AuctionSetupUiState, viewModel: AuctionSetupViewModel) {
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Import players", style = MaterialTheme.typography.titleSmall)
      Text(
        "One player per line: name, position, base price. Position and base price are optional.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      OutlinedTextField(
        value = uiState.csvText,
        onValueChange = viewModel::onCsvTextChanged,
        label = { Text("Virat Kohli, Batsman, 2000") },
        minLines = 3,
        modifier = Modifier.fillMaxWidth(),
      )
      uiState.importResult?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
      Button(onClick = viewModel::importCsv, enabled = !uiState.importingCsv && uiState.csvText.isNotBlank()) {
        Text(if (uiState.importingCsv) "Importing..." else "Import players")
      }
    }
  }
}

@Composable
private fun AddRegisteredPlayerCard(uiState: AuctionSetupUiState, viewModel: AuctionSetupViewModel) {
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Add a registered player", style = MaterialTheme.typography.titleSmall)
      Text(
        "Search players who already have an account — adding them here links this lot to their " +
          "profile (photo, batting/bowling style) instead of a plain typed name.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      OutlinedTextField(
        value = uiState.registeredPlayerSearch,
        onValueChange = viewModel::onRegisteredSearchChanged,
        label = { Text("Search by name, email, phone, or user code") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      if (uiState.registeredPlayerSearch.isNotBlank()) {
        if (uiState.registeredPlayers.isEmpty()) {
          Text("No registered players match.", style = MaterialTheme.typography.bodySmall)
        }
        uiState.registeredPlayers.forEach { user -> RegisteredPlayerRow(user, uiState, viewModel) }
      }
    }
  }
}

@Composable
private fun RegisteredPlayerRow(user: AppUser, uiState: AuctionSetupUiState, viewModel: AuctionSetupViewModel) {
  val adding = user.uid in uiState.addingRegisteredPlayerIds
  Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
    Text(user.displayName, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
    OutlinedTextField(
      value = uiState.registeredBasePrices[user.uid] ?: "",
      onValueChange = { viewModel.onRegisteredBasePriceChanged(user.uid, it) },
      label = { Text("Base") },
      singleLine = true,
      modifier = Modifier.weight(0.6f),
    )
    Button(onClick = { viewModel.addRegisteredPlayer(user) }, enabled = !adding) {
      Text(if (adding) "Adding..." else "Add")
    }
  }
}
