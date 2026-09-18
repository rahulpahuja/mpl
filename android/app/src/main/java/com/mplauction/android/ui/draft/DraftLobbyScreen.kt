package com.mplauction.android.ui.draft

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.PlaylistAdd
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ClipboardManager
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.model.DraftMatchStatus
import com.mplauction.android.ui.theme.BrandOrange

@Composable
fun DraftLobbyScreen(state: DraftUiState, actions: DraftLobbyActions, modifier: Modifier = Modifier) {
  val clipboard = LocalClipboardManager.current
  Column(modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp)) {
    MatchHeader(state, clipboard)

    Spacer(Modifier.height(16.dp))
    Text(
      "${state.roster.size} players in the roster · tap two to make them Captains",
      color = Color.White.copy(alpha = 0.6f),
      style = MaterialTheme.typography.bodyMedium,
    )
    Spacer(Modifier.height(10.dp))

    RosterGrid(state, actions)

    if (!state.hasJoined && !state.isHost) {
      Spacer(Modifier.height(12.dp))
      Button(onClick = actions.onJoin, enabled = !state.joining, modifier = Modifier.fillMaxWidth()) {
        Text(if (state.joining) "Joining..." else "Join this match")
      }
    }

    if (state.roster.size < MIN_DRAFT_PLAYERS) {
      Text(
        "Need at least $MIN_DRAFT_PLAYERS players to start a draft.",
        color = Color(0xFFFCA5A5),
        style = MaterialTheme.typography.labelMedium,
        modifier = Modifier.padding(top = 12.dp),
      )
    }

    if (state.isHost) {
      Spacer(Modifier.height(16.dp))
      Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedButton(onClick = actions.onShuffleCaptains, enabled = state.roster.size >= MIN_DRAFT_PLAYERS, modifier = Modifier.weight(1f)) {
          Icon(Icons.Filled.Casino, contentDescription = null)
          Spacer(Modifier.width(8.dp))
          Text("Shuffle Captains")
        }
        Button(onClick = actions.onStartDraft, enabled = state.canStartDraft, modifier = Modifier.weight(1f)) {
          Text("Start Draft")
        }
      }

      Spacer(Modifier.height(24.dp))
      OutlinedButton(
        onClick = actions.onOpenImportPlayers,
        colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandOrange),
        border = BorderStroke(1.dp, BrandOrange),
        modifier = Modifier.fillMaxWidth(),
      ) {
        Icon(Icons.AutoMirrored.Filled.PlaylistAdd, contentDescription = null)
        Spacer(Modifier.width(8.dp))
        Text("Import players")
      }
      Spacer(Modifier.height(20.dp))
      AddManualPlayerSection(state, actions)
    } else {
      Spacer(Modifier.height(16.dp))
      Text(
        "${state.hostName.ifBlank { "The host" }} is setting up the roster — the draft starts once they pick two Captains.",
        color = Color.White.copy(alpha = 0.5f),
        style = MaterialTheme.typography.bodySmall,
      )
    }

    state.error?.let {
      Spacer(Modifier.height(12.dp))
      Text(it, color = Color(0xFFFCA5A5), style = MaterialTheme.typography.bodySmall)
    }
    Spacer(Modifier.height(24.dp))
  }
}

// Bundles every callback DraftLobbyScreen needs so its own signature (and
// every private section below) stays readable instead of an 8-lambda list.
data class DraftLobbyActions(
  val onJoin: () -> Unit,
  val onToggleCaptain: (DraftPlayer) -> Unit,
  val onRemovePlayer: (DraftPlayer) -> Unit,
  val onShuffleCaptains: () -> Unit,
  val onStartDraft: () -> Unit,
  val onOpenImportPlayers: () -> Unit,
  val onManualNameChanged: (String) -> Unit,
  val onManualPhoneChanged: (String) -> Unit,
  val onManualEmailChanged: (String) -> Unit,
  val onAddManualPlayer: () -> Unit,
)

@Composable
private fun MatchHeader(state: DraftUiState, clipboard: ClipboardManager) {
  Column {
    Text(state.matchName.ifBlank { "Match Lobby" }, color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
      Text("Match ID ", color = Color.White.copy(alpha = 0.5f), style = MaterialTheme.typography.bodySmall)
      Text(state.matchId, color = Color.White.copy(alpha = 0.85f), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
      IconButton(onClick = { clipboard.setText(AnnotatedString(state.matchId)) }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.Filled.ContentCopy, contentDescription = "Copy match ID", tint = Color.White.copy(alpha = 0.5f), modifier = Modifier.size(16.dp))
      }
      Text("· share this so others can join", color = Color.White.copy(alpha = 0.4f), style = MaterialTheme.typography.bodySmall)
    }
  }
}

@Composable
private fun RosterGrid(state: DraftUiState, actions: DraftLobbyActions) {
  LazyVerticalGrid(
    columns = GridCells.Adaptive(84.dp),
    horizontalArrangement = Arrangement.spacedBy(10.dp),
    verticalArrangement = Arrangement.spacedBy(10.dp),
    modifier = Modifier.heightIn(max = 420.dp),
  ) {
    items(state.roster, key = { it.id }) { player ->
      val captainBadge = state.captainIds.indexOf(player.id).let { if (it >= 0) it + 1 else null }
      Box {
        PlayerCard(
          player,
          captainBadge = captainBadge,
          onClick = if (state.isHost) ({ actions.onToggleCaptain(player) }) else null,
        )
        if (state.isHost && state.phase == DraftMatchStatus.lobby && player.uid != state.hostUid) {
          IconButton(onClick = { actions.onRemovePlayer(player) }, modifier = Modifier.align(Alignment.TopStart).size(22.dp)) {
            Icon(Icons.Filled.Close, contentDescription = "Remove ${player.name}", tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
          }
        }
      }
    }
  }
}

@Composable
private fun AddManualPlayerSection(state: DraftUiState, actions: DraftLobbyActions) {
  Column {
    Row(verticalAlignment = Alignment.CenterVertically) {
      Icon(Icons.Filled.PersonAdd, contentDescription = null, tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
      Spacer(Modifier.width(6.dp))
      Text("Add a new player", color = Color.White, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
    }
    Text(
      "No account needed — phone and email are optional and only help match them to their profile later.",
      color = Color.White.copy(alpha = 0.5f),
      style = MaterialTheme.typography.bodySmall,
      modifier = Modifier.padding(top = 2.dp, bottom = 8.dp),
    )
    OutlinedTextField(
      value = state.manualName,
      onValueChange = actions.onManualNameChanged,
      label = { Text("Name") },
      singleLine = true,
      modifier = Modifier.fillMaxWidth(),
    )
    Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OutlinedTextField(
        value = state.manualPhone,
        onValueChange = actions.onManualPhoneChanged,
        label = { Text("Phone (optional)") },
        singleLine = true,
        modifier = Modifier.weight(1f),
      )
      OutlinedTextField(
        value = state.manualEmail,
        onValueChange = actions.onManualEmailChanged,
        label = { Text("Gmail (optional)") },
        singleLine = true,
        modifier = Modifier.weight(1f),
      )
    }
    Button(
      onClick = actions.onAddManualPlayer,
      enabled = !state.addingManual && state.manualName.isNotBlank(),
      modifier = Modifier.padding(top = 8.dp),
    ) {
      Text(if (state.addingManual) "Adding..." else "Add player")
    }
  }
}
