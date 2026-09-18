package com.mplauction.android.ui.draft

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.DraftMatch
import com.mplauction.android.data.model.DraftMatchStatus

private fun statusLabel(status: DraftMatchStatus) =
  when (status) {
    DraftMatchStatus.lobby -> "lobby"
    DraftMatchStatus.captainReveal -> "captains"
    DraftMatchStatus.drafting -> "drafting"
    DraftMatchStatus.complete -> "complete"
  }

@Composable
fun MatchesListScreen(currentUser: AppUser, onOpenMatch: (String) -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: MatchesListViewModel = viewModel(key = "matches-list") { MatchesListViewModel(container.draftMatchRepository, currentUser) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var pendingDelete by remember { mutableStateOf<DraftMatch?>(null) }

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
    item {
      Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Text("Start a Team Draft", style = MaterialTheme.typography.titleSmall)
          Text(
            "Create a match, pick two Captains, and draft the rest live with anyone who joins.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
          OutlinedTextField(
            value = uiState.newMatchName,
            onValueChange = viewModel::onNameChanged,
            label = { Text("Match name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
          )
          Button(
            onClick = { viewModel.createMatch(onOpenMatch) },
            enabled = !uiState.creating && uiState.newMatchName.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
          ) {
            Text(if (uiState.creating) "Creating..." else "Create match")
          }
        }
      }
    }

    item { Text("Open matches", style = MaterialTheme.typography.titleSmall) }
    items(uiState.matches, key = { it.matchId }) { match ->
      MatchRow(
        match = match,
        isHost = match.hostUid == currentUser.uid,
        onOpen = { onOpenMatch(match.matchId) },
        onLongPressDelete = { pendingDelete = match },
      )
    }
    if (uiState.matches.isEmpty()) item { Text("No matches are open right now — create one above.", style = MaterialTheme.typography.bodyMedium) }

    item {
      Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Text("Join by match ID", style = MaterialTheme.typography.titleSmall)
          OutlinedTextField(
            value = uiState.joinId,
            onValueChange = viewModel::onJoinIdChanged,
            label = { Text("Match ID, e.g. A1B2C3") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
          )
          Button(onClick = { onOpenMatch(uiState.joinId.trim()) }, enabled = uiState.joinId.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
            Text("Join")
          }
        }
      }
    }

    uiState.error?.let { error -> item { Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) } }
  }

  pendingDelete?.let { match ->
    AlertDialog(
      onDismissRequest = { pendingDelete = null },
      title = { Text("Delete \"${match.name}\"?") },
      text = { Text("This removes the match and its roster for everyone. This can't be undone.") },
      confirmButton = {
        TextButton(onClick = { viewModel.deleteMatch(match.matchId); pendingDelete = null }) { Text("Delete") }
      },
      dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel") } },
    )
  }
}

// Long-press is host-only — everyone can open a match, only its creator can
// delete it (also enforced server-side by firestore.rules' isDraftHost).
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MatchRow(match: DraftMatch, isHost: Boolean, onOpen: () -> Unit, onLongPressDelete: () -> Unit) {
  Card(
    modifier =
      Modifier.fillMaxWidth().combinedClickable(onClick = onOpen, onLongClick = if (isHost) onLongPressDelete else null),
  ) {
    Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Column(Modifier.weight(1f)) {
        Text(match.name, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium)
        Text("${match.players.size} players · hosted by ${match.hostName}", style = MaterialTheme.typography.bodySmall)
      }
      SuggestionChip(onClick = {}, label = { Text(statusLabel(match.status)) })
    }
  }
}
