package com.mplauction.android.ui.draft

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.MatchRules
import com.mplauction.android.data.model.DraftMatch
import com.mplauction.android.data.model.DraftMatchStatus
import com.mplauction.android.data.model.Match
import com.mplauction.android.data.model.MatchStatus
import com.mplauction.android.ui.theme.BrandBlue
import com.mplauction.android.ui.theme.BrandMint
import com.mplauction.android.ui.theme.BrandOrange
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// One colour per stage of a match's life, so the list reads at a glance:
// blue/violet/amber while drafting, mint once teams are ready, red while
// live, orange at the break, slate once it's over.
private data class StatusStyle(val label: String, val color: Color)

private val Violet = Color(0xFF8B5CF6)
private val Amber = Color(0xFFF59E0B)
private val LiveRed = Color(0xFFEF4444)
private val Slate = Color(0xFF64748B)

private fun statusStyle(status: DraftMatchStatus) =
  when (status) {
    DraftMatchStatus.lobby -> StatusStyle("lobby", BrandBlue)
    DraftMatchStatus.captainReveal -> StatusStyle("captains", Violet)
    DraftMatchStatus.drafting -> StatusStyle("drafting", Amber)
    DraftMatchStatus.complete -> StatusStyle("teams ready", BrandMint)
  }

@Composable
private fun StatusPill(style: StatusStyle) {
  Text(
    style.label,
    color = style.color,
    style = MaterialTheme.typography.labelMedium,
    fontWeight = FontWeight.Bold,
    modifier =
      Modifier.clip(CircleShape)
        .background(style.color.copy(alpha = 0.14f))
        .border(1.dp, style.color.copy(alpha = 0.55f), CircleShape)
        .padding(horizontal = 12.dp, vertical = 6.dp),
  )
}

@Composable
fun MatchesListScreen(currentUser: AppUser, onOpenMatch: (String) -> Unit, onOpenLiveMatch: (String) -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: MatchesListViewModel =
    viewModel(key = "matches-list") { MatchesListViewModel(container.draftMatchRepository, container.matchRepository, currentUser) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var pendingDelete by remember { mutableStateOf<DraftMatch?>(null) }
  var tab by rememberSaveable { mutableStateOf(MatchesTab.OPEN) }
  var starting by remember { mutableStateOf(false) }

  Box(modifier) {
    Column(Modifier.fillMaxSize()) {
      PrimaryTabRow(selectedTabIndex = tab.ordinal) {
        MatchesTab.entries.forEach { t ->
          val count =
            when (t) {
              MatchesTab.LIVE -> uiState.activeMatches.size
              MatchesTab.RECENT -> uiState.finishedMatches.size
              MatchesTab.OPEN -> uiState.matches.size
            }
          Tab(selected = tab == t, onClick = { tab = t }, text = { Text(if (count > 0) "${t.title} ($count)" else t.title) })
        }
      }
      // Bottom padding keeps the last row clear of the + button.
      LazyColumn(contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 88.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize()) {
        when (tab) {
          MatchesTab.LIVE -> {
            items(uiState.activeMatches, key = { it.matchId }) { match -> LiveMatchRow(match, onOpen = { onOpenLiveMatch(match.matchId) }) }
            if (uiState.activeMatches.isEmpty()) item { EmptyTabText("No live matches right now — tap + to start one.") }
          }
          MatchesTab.RECENT -> {
            items(uiState.finishedMatches, key = { it.matchId }) { match -> LiveMatchRow(match, onOpen = { onOpenLiveMatch(match.matchId) }) }
            if (uiState.finishedMatches.isEmpty()) item { EmptyTabText("No finished matches yet.") }
          }
          MatchesTab.OPEN -> openTabItems(uiState, viewModel, currentUser, onOpenMatch, onDelete = { pendingDelete = it })
        }
        uiState.error?.let { error -> item { Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) } }
      }
    }
    FloatingActionButton(
      onClick = { viewModel.onNameChanged(defaultMatchName()); starting = true },
      modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
    ) {
      Icon(Icons.Filled.Add, contentDescription = "Start a match")
    }
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

  // Pre-filled name, so starting a match is + then Start.
  if (starting) {
    AlertDialog(
      onDismissRequest = { if (!uiState.creating) starting = false },
      title = { Text("Start a match") },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Text("Pick two Captains and draft the rest live with anyone who joins.", style = MaterialTheme.typography.bodySmall)
          OutlinedTextField(
            value = uiState.newMatchName,
            onValueChange = viewModel::onNameChanged,
            label = { Text("Match name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
          )
        }
      },
      confirmButton = {
        TextButton(
          onClick = { viewModel.createMatch { id -> starting = false; onOpenMatch(id) } },
          enabled = !uiState.creating && uiState.newMatchName.isNotBlank(),
        ) {
          Text(if (uiState.creating) "Starting..." else "Start")
        }
      },
      dismissButton = { TextButton(onClick = { starting = false }, enabled = !uiState.creating) { Text("Cancel") } },
    )
  }
}

private fun defaultMatchName(): String = "Match · " + SimpleDateFormat("d MMM, h:mm a", Locale.getDefault()).format(Date())

private enum class MatchesTab(val title: String) { OPEN("Open"), LIVE("Live"), RECENT("Recent") }

@Composable
private fun EmptyTabText(text: String) {
  Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

// Drafts still forming teams, plus joining one by its ID (starting a new
// one is the + button).
private fun LazyListScope.openTabItems(
  uiState: MatchesListUiState,
  viewModel: MatchesListViewModel,
  currentUser: AppUser,
  onOpenMatch: (String) -> Unit,
  onDelete: (DraftMatch) -> Unit,
) {
  items(uiState.matches, key = { it.matchId }) { match ->
    MatchRow(
      match = match,
      isHost = match.hostUid == currentUser.uid,
      onOpen = { onOpenMatch(match.matchId) },
      onLongPressDelete = { onDelete(match) },
    )
  }
  if (uiState.matches.isEmpty()) item { EmptyTabText("No matches are open right now — tap + to start one.") }

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
}

private fun statusStyle(status: MatchStatus) =
  when (status) {
    MatchStatus.setup, MatchStatus.toss -> StatusStyle("toss", Amber)
    MatchStatus.live -> StatusStyle("LIVE", LiveRed)
    MatchStatus.inningsBreak -> StatusStyle("innings break", BrandOrange)
    MatchStatus.completed -> StatusStyle("result", Slate)
    MatchStatus.abandoned -> StatusStyle("abandoned", Slate)
  }

@Composable
private fun LiveMatchRow(match: Match, onOpen: () -> Unit) {
  val innings = if (match.currentInnings == 1L) match.innings1 else match.innings2
  val subtitle =
    when {
      match.status == MatchStatus.completed -> match.result.orEmpty()
      innings != null -> {
        val batting = if (match.teamA.teamId == innings.battingTeamId) match.teamA else match.teamB
        "${batting.teamName} ${innings.totalRuns}/${innings.wickets} (${MatchRules.formatOvers(innings.legalBallsBowled)} / ${match.oversLimit} ov)"
      }
      else -> "${match.oversLimit} Over Match"
    }
  Card(onClick = onOpen, modifier = Modifier.fillMaxWidth()) {
    Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Column(Modifier.weight(1f)) {
        Text("${match.teamA.teamName} vs ${match.teamB.teamName}", maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium)
        Text(subtitle, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
      }
      StatusPill(statusStyle(match.status))
    }
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
      StatusPill(statusStyle(match.status))
    }
  }
}
