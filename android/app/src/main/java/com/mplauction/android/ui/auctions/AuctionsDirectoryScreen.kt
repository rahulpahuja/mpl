package com.mplauction.android.ui.auctions

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.SPORTS
import com.mplauction.android.data.location.ANY
import com.mplauction.android.data.location.summarize
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.AuctionStatus
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.data.sportName
import com.mplauction.android.ui.theme.BrandMint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuctionsDirectoryScreen(
  user: AppUser,
  canCreate: Boolean,
  onOpenAuction: (Auction) -> Unit,
  modifier: Modifier = Modifier,
) {
  val context = LocalContext.current
  val container = context.appContainer()
  val viewModel: AuctionsDirectoryViewModel =
    viewModel(key = "auctions-directory") {
      AuctionsDirectoryViewModel(container.auctionRepository, container.userRepository, user.uid)
    }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()

  LaunchedEffect(Unit) { viewModel.loadCountries(context) }

  val locationPermissionLauncher =
    rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      if (granted) viewModel.detectLocation(context)
    }
  fun requestLocation() {
    val hasPermission =
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
    if (hasPermission) viewModel.detectLocation(context)
    else locationPermissionLauncher.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
  }

  LazyColumn(
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
    modifier = modifier,
  ) {
    item { KpiRow(uiState.auctions) }
    item {
      SportLocationFilterBar(
        uiState = uiState,
        onSportSelected = viewModel::onSportSelected,
        onCountrySelected = { code, name -> viewModel.onCountrySelected(context, code, name) },
        onStateSelected = viewModel::onStateSelected,
        onCitySelected = viewModel::onCitySelected,
        onDetect = { requestLocation() },
        onClear = viewModel::clearFilter,
      )
    }
    if (canCreate) {
      item { CreateAuctionCard(uiState, viewModel::onNameChanged, { viewModel.createAuction {} }) }
    }
    if (user.role == UserRole.viewer) {
      item { RequestPlayerCard(playerRequested = user.playerRequested == true, requesting = uiState.requestingPlayer, onRequest = { viewModel.requestPlayer(user.uid) }) }
    }
    uiState.error?.let { error ->
      item { Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
    }
    if (uiState.hiddenCount > 0) {
      item {
        Text(
          "${uiState.hiddenCount} hidden by the sport/location filter",
          style = MaterialTheme.typography.bodySmall,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }
    items(uiState.filtered, key = { it.auctionId }) { auction ->
      AuctionCard(auction, onClick = { onOpenAuction(auction) }, modifier = Modifier.animateItem())
    }
    if (!uiState.loading && uiState.filtered.isEmpty()) {
      item { Text("No auctions yet.", style = MaterialTheme.typography.bodyMedium) }
    }
  }
}

@Composable
private fun KpiRow(auctions: List<Auction>) {
  val live = auctions.count { it.status == AuctionStatus.live }
  val draft = auctions.count { it.status == AuctionStatus.draft }
  val completed = auctions.count { it.status == AuctionStatus.completed }
  val players = auctions.sumOf { it.players.size }
  Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
    Kpi("Live", live, MaterialTheme.colorScheme.secondaryContainer, MaterialTheme.colorScheme.onSecondaryContainer, Modifier.weight(1f))
    Kpi("Draft", draft, MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant, Modifier.weight(1f))
    Kpi(
      "Completed",
      completed,
      MaterialTheme.colorScheme.tertiaryContainer,
      MaterialTheme.colorScheme.onTertiaryContainer,
      Modifier.weight(1f),
    )
    Kpi(
      "Players pooled",
      players,
      MaterialTheme.colorScheme.primaryContainer,
      MaterialTheme.colorScheme.onPrimaryContainer,
      Modifier.weight(1f),
    )
  }
}

@Composable
private fun Kpi(label: String, value: Int, containerColor: Color, contentColor: Color, modifier: Modifier = Modifier) {
  Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = containerColor, contentColor = contentColor)) {
    Column(Modifier.padding(12.dp)) {
      Text(label, style = MaterialTheme.typography.labelSmall)
      Text("$value", style = MaterialTheme.typography.headlineSmall)
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SportLocationFilterBar(
  uiState: AuctionsDirectoryUiState,
  onSportSelected: (String) -> Unit,
  onCountrySelected: (String, String) -> Unit,
  onStateSelected: (String) -> Unit,
  onCitySelected: (String) -> Unit,
  onDetect: () -> Unit,
  onClear: () -> Unit,
) {
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        DropdownChip(
          label = if (uiState.filter.sport == ANY) "Any sport" else sportName(uiState.filter.sport),
          options = listOf(ANY to "Any sport") + SPORTS.map { it.id to it.name },
          onSelected = { onSportSelected(it) },
        )
        DropdownChip(
          label = if (uiState.filter.country == ANY) "Any country" else uiState.filter.country,
          options = listOf(ANY to "Any country") + uiState.countries.map { it.code to it.name },
          onSelected = { code -> onCountrySelected(code, uiState.countries.find { it.code == code }?.name ?: code) },
        )
        if (uiState.states.isNotEmpty()) {
          DropdownChip(
            label = if (uiState.filter.state == ANY) "Any state" else uiState.filter.state,
            options = listOf(ANY to "Any state") + uiState.states.map { it to it },
            onSelected = { onStateSelected(it) },
          )
        }
        IconButton(onClick = onDetect) {
          if (uiState.detectingLocation) CircularProgressIndicator(Modifier.padding(4.dp))
          else Icon(Icons.Filled.LocationOn, contentDescription = "Use my location")
        }
      }
      OutlinedTextField(
        value = uiState.filter.city.takeIf { it != ANY } ?: "",
        onValueChange = { onCitySelected(it.ifBlank { ANY }) },
        label = { Text("City") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      if (uiState.filter.sport != ANY || uiState.filter.country != ANY) {
        TextButton(onClick = onClear) { Text("Clear filter (showing: ${uiState.filter.toLocation().summarize()})") }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownChip(label: String, options: List<Pair<String, String>>, onSelected: (String) -> Unit) {
  var expanded by remember { mutableStateOf(false) }
  Column {
    AssistChip(onClick = { expanded = true }, label = { Text(label) })
    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
      options.forEach { (value, display) ->
        DropdownMenuItem(text = { Text(display) }, onClick = { onSelected(value); expanded = false })
      }
    }
  }
}

@Composable
private fun CreateAuctionCard(uiState: AuctionsDirectoryUiState, onNameChanged: (String) -> Unit, onCreate: () -> Unit) {
  Card {
    Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OutlinedTextField(
        value = uiState.newAuctionName,
        onValueChange = onNameChanged,
        label = { Text("New auction name") },
        singleLine = true,
        modifier = Modifier.weight(1f),
      )
      Button(onClick = onCreate, enabled = uiState.newAuctionName.isNotBlank() && !uiState.creating) {
        Text(if (uiState.creating) "Creating..." else "Create")
      }
    }
  }
}

// Mirrors Home.tsx's viewer-only card: self-service instead of an admin
// having to spot a new signup in a crowd (see UserRepository.requestToBePlayer).
@Composable
private fun RequestPlayerCard(playerRequested: Boolean, requesting: Boolean, onRequest: () -> Unit) {
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text(
        "Want to be up for auction? Request to become a Player and an Admin, Auction Manager, or Captain can approve it.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      if (playerRequested) {
        Text("Request pending approval...", style = MaterialTheme.typography.bodySmall, color = Color(0xFFD97706))
      } else {
        Button(onClick = onRequest, enabled = !requesting) {
          Text(if (requesting) "Requesting..." else "Request to become a Player")
        }
      }
    }
  }
}

@Composable
private fun AuctionCard(auction: Auction, onClick: () -> Unit, modifier: Modifier = Modifier) {
  Card(onClick = onClick, modifier = modifier.fillMaxWidth()) {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(auction.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        StatusChip(auction.status)
      }
      Text(
        listOfNotNull(sportName(auction.sport), auction.location).joinToString(" · "),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      Text(
        "${auction.players.size} players · ${auction.teamManagers.size} teams",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
    }
  }
}

// Mirrors AdminAuctions.tsx's STATUS_CHIP mapping (muted/orange/mint) so an
// auction's status reads the same way it does on the web app.
@Composable
private fun StatusChip(status: AuctionStatus) {
  val (container, content) =
    when (status) {
      AuctionStatus.draft -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
      AuctionStatus.live -> MaterialTheme.colorScheme.secondaryContainer to MaterialTheme.colorScheme.onSecondaryContainer
      AuctionStatus.completed -> BrandMint.copy(alpha = 0.18f) to BrandMint
    }
  SuggestionChip(
    onClick = {},
    label = { Text(status.name) },
    colors = SuggestionChipDefaults.suggestionChipColors(containerColor = container, labelColor = content),
    border = null,
  )
}
