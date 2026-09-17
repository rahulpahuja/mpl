package com.mplauction.android.ui.venues

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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.Venue

@Composable
fun VenuesScreen(modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: VenuesViewModel = viewModel(key = "venues") { VenuesViewModel(container.venueRepository) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
    item {
      Card {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Text("Add a venue", style = MaterialTheme.typography.titleSmall)
          OutlinedTextField(
            value = uiState.name,
            onValueChange = viewModel::onNameChanged,
            label = { Text("Name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
          )
          OutlinedTextField(
            value = uiState.location,
            onValueChange = viewModel::onLocationChanged,
            label = { Text("Location") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
          )
          uiState.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
          Button(onClick = viewModel::createVenue, enabled = !uiState.creating && uiState.name.isNotBlank()) {
            Text(if (uiState.creating) "Adding..." else "Add venue")
          }
        }
      }
    }
    items(uiState.venues, key = { it.venueId }) { venue -> VenueRow(venue, viewModel) }
    if (uiState.venues.isEmpty()) item { Text("No venues yet.", style = MaterialTheme.typography.bodyMedium) }
  }
}

@Composable
private fun VenueRow(venue: Venue, viewModel: VenuesViewModel) {
  val retired = venue.retired == true
  Card(modifier = Modifier.fillMaxWidth()) {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
        Text(venue.name, style = MaterialTheme.typography.bodyLarge)
        if (retired) SuggestionChip(onClick = {}, label = { Text("retired") })
      }
      Text(venue.location, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(onClick = { viewModel.setRetired(venue.venueId, !retired) }) { Text(if (retired) "Unretire" else "Retire") }
        TextButton(onClick = { viewModel.delete(venue.venueId) }) { Text("Delete") }
      }
    }
  }
}
