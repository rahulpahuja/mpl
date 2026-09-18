package com.mplauction.android.ui.match

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.PLAYING_ROLE_LABELS
import com.mplauction.android.data.model.BallType
import com.mplauction.android.data.model.GroundType
import com.mplauction.android.data.model.MatchStatus
import com.mplauction.android.data.model.MatchTeamSide
import com.mplauction.android.ui.common.PlayerAvatar
import com.mplauction.android.ui.draft.draftTeamColor

@Composable
fun TeamsTab(state: MatchUiState, modifier: Modifier = Modifier) {
  val match = state.match ?: return
  Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
    listOf(match.teamA, match.teamB).forEachIndexed { index, side -> TeamRoster(state, side, index) }
  }
}

@Composable
private fun TeamRoster(state: MatchUiState, side: MatchTeamSide, index: Int) {
  MatchCard {
    Text(side.label(), color = draftTeamColor(index), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    Text("${side.playingXI.size} players", color = MatchTextDim, style = MaterialTheme.typography.labelSmall)
    side.playingXI.map(state::player).forEach { p ->
      Row(Modifier.fillMaxWidth().padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        PlayerAvatar(photoURL = p.photoURL, avatarId = p.avatarId, name = p.name, size = 36.dp)
        Column(Modifier.weight(1f)) {
          Text(if (p.id == side.captainId) "${p.name} (C)" else p.name, color = Color.White, fontWeight = if (p.id == side.captainId) FontWeight.Bold else FontWeight.Normal)
          PLAYING_ROLE_LABELS[p.role]?.let { Text(it, color = MatchTextDim, style = MaterialTheme.typography.labelSmall) }
        }
      }
    }
  }
}

private fun MatchStatus.label() =
  when (this) {
    MatchStatus.setup, MatchStatus.toss -> "Ready"
    MatchStatus.live -> "Live"
    MatchStatus.inningsBreak -> "Innings break"
    MatchStatus.completed -> "Completed"
    MatchStatus.abandoned -> "Abandoned"
  }

@Composable
fun InfoTab(state: MatchUiState, modifier: Modifier = Modifier) {
  val match = state.match ?: return
  Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
    MatchCard {
      InfoRow("Match", match.name)
      InfoRow("Format", "${match.oversLimit} Over Match")
      InfoRow("Location", match.venueName?.let { "📍 $it" } ?: "Not set")
      InfoRow("Ball", if (match.ballType == BallType.tennis) "Tennis ball" else "Leather ball")
      InfoRow(
        "Ground",
        when (match.groundType) {
          GroundType.box -> "Box cricket"
          GroundType.gully -> "Gully"
          GroundType.ground -> "Ground"
        },
      )
      InfoRow("Captains", "${state.captainName(match.teamA)} vs ${state.captainName(match.teamB)}")
      InfoRow("Toss", state.tossSummary ?: "Not yet")
      InfoRow("Status", match.status.label())
      match.result?.takeIf { it.isNotBlank() }?.let { InfoRow("Result", it) }
    }
  }
}

@Composable
private fun InfoRow(label: String, value: String) {
  Column(Modifier.padding(vertical = 6.dp)) {
    Text(label, color = MatchTextDim, style = MaterialTheme.typography.labelSmall)
    Text(value, color = Color.White, style = MaterialTheme.typography.bodyLarge)
  }
}
