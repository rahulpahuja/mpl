package com.mplauction.android.ui.draft

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.PLAYING_ROLE_LABELS
import com.mplauction.android.ui.common.PlayerAvatar
import com.mplauction.android.ui.theme.BrandBlue
import com.mplauction.android.ui.theme.BrandOrange

fun draftTeamColor(teamIndex: Int): Color = if (teamIndex == 0) BrandBlue else BrandOrange

// Used both in the lobby (tap to make someone Captain 1/2) and the draft
// board's available-players pool (tap to draft) — captainBadge/onClick
// switch between the two without duplicating the card layout.
@Composable
fun PlayerCard(player: DraftPlayer, modifier: Modifier = Modifier, captainBadge: Int? = null, onClick: (() -> Unit)? = null) {
  val highlight = captainBadge?.let { draftTeamColor(it - 1) }
  Box(modifier.width(84.dp)) {
    Column(
      Modifier
        .clip(MaterialTheme.shapes.medium)
        .background(Color.White.copy(alpha = 0.06f))
        .border(BorderStroke(if (highlight != null) 2.dp else 1.dp, highlight ?: Color.White.copy(alpha = 0.12f)), MaterialTheme.shapes.medium)
        .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
        .padding(vertical = 10.dp, horizontal = 6.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      PlayerAvatar(photoURL = player.photoURL, avatarId = player.avatarId, name = player.name, size = 52.dp)
      Spacer(Modifier.height(6.dp))
      Text(player.name, color = Color.White, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
      Text(
        PLAYING_ROLE_LABELS[player.role].orEmpty(),
        color = Color.White.copy(alpha = 0.6f),
        style = MaterialTheme.typography.labelSmall,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
      )
    }
    if (highlight != null) {
      Box(
        Modifier.align(Alignment.TopEnd).padding(2.dp).size(20.dp).clip(CircleShape).background(highlight),
        contentAlignment = Alignment.Center,
      ) {
        Text("C$captainBadge", color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
      }
    }
  }
}

// The big reveal card for "Captain 1" / "Captain 2".
@Composable
fun CaptainCard(player: DraftPlayer, teamIndex: Int, modifier: Modifier = Modifier) {
  val color = draftTeamColor(teamIndex)
  Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
    Text("CAPTAIN ${teamIndex + 1}", color = color, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
    Spacer(Modifier.height(12.dp))
    Box(
      Modifier.size(120.dp).clip(CircleShape).border(BorderStroke(3.dp, color), CircleShape).padding(6.dp),
      contentAlignment = Alignment.Center,
    ) {
      PlayerAvatar(photoURL = player.photoURL, avatarId = player.avatarId, name = player.name, size = 100.dp)
    }
    Spacer(Modifier.height(10.dp))
    Text(player.name, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
    Text("Team ${player.name}", color = Color.White.copy(alpha = 0.65f), style = MaterialTheme.typography.bodyMedium)
  }
}

// Compact on the draft board (sidebar-by-sidebar with the pool); `expanded`
// switches to the bigger roster-grid layout for the final reveal screen.
@Composable
fun TeamCard(team: DraftTeam, teamIndex: Int, isActiveTurn: Boolean, modifier: Modifier = Modifier, expanded: Boolean = false) {
  val color = draftTeamColor(teamIndex)
  Column(
    modifier
      .fillMaxWidth()
      .clip(MaterialTheme.shapes.large)
      .background(color.copy(alpha = if (isActiveTurn) 0.22f else 0.10f))
      .border(BorderStroke(if (isActiveTurn) 2.dp else 1.dp, color.copy(alpha = if (isActiveTurn) 0.9f else 0.35f)), MaterialTheme.shapes.large)
      .padding(if (expanded) 16.dp else 12.dp),
  ) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      PlayerAvatar(photoURL = team.captain.photoURL, avatarId = team.captain.avatarId, name = team.captain.name, size = if (expanded) 48.dp else 36.dp)
      Column(Modifier.weight(1f)) {
        Text(
          team.name,
          color = Color.White,
          style = if (expanded) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleSmall,
          fontWeight = FontWeight.Bold,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
        )
        Text(
          "Captain · ${team.players.size} player${if (team.players.size == 1) "" else "s"}",
          color = Color.White.copy(alpha = 0.6f),
          style = MaterialTheme.typography.labelSmall,
        )
      }
      if (isActiveTurn) Icon(Icons.Filled.Bolt, contentDescription = "On the clock", tint = color)
    }
    Spacer(Modifier.height(if (expanded) 14.dp else 10.dp))
    val roster = team.players.drop(1)
    if (roster.isEmpty()) {
      Text("No picks yet", color = Color.White.copy(alpha = 0.4f), style = MaterialTheme.typography.labelSmall)
    } else {
      FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        roster.forEach { player ->
          if (expanded) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(64.dp)) {
              PlayerAvatar(photoURL = player.photoURL, avatarId = player.avatarId, name = player.name, size = 44.dp)
              Text(player.name, color = Color.White, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
          } else {
            PlayerAvatar(photoURL = player.photoURL, avatarId = player.avatarId, name = player.name, size = 28.dp)
          }
        }
      }
    }
  }
}

@Composable
fun DraftTimer(secondsRemaining: Int, totalSeconds: Int, modifier: Modifier = Modifier) {
  val progress by animateFloatAsState(
    targetValue = secondsRemaining.toFloat() / totalSeconds,
    animationSpec = tween(400, easing = LinearEasing),
    label = "draft-timer-progress",
  )
  val urgent = secondsRemaining <= 5
  val color = if (urgent) Color(0xFFEF4444) else Color(0xFF34D399)
  Box(modifier.size(56.dp), contentAlignment = Alignment.Center) {
    Canvas(Modifier.size(56.dp)) {
      val stroke = 5.dp.toPx()
      drawArc(Color.White.copy(alpha = 0.15f), startAngle = -90f, sweepAngle = 360f, useCenter = false, style = Stroke(stroke, cap = StrokeCap.Round))
      drawArc(color, startAngle = -90f, sweepAngle = 360f * progress, useCenter = false, style = Stroke(stroke, cap = StrokeCap.Round))
    }
    Text(secondsRemaining.toString(), color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
  }
}

@Composable
fun DraftTurnIndicator(team: DraftTeam, teamIndex: Int, secondsRemaining: Int, totalSeconds: Int, canIPick: Boolean, modifier: Modifier = Modifier) {
  val color = draftTeamColor(teamIndex)
  Row(
    modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(20.dp))
      .background(color.copy(alpha = 0.18f))
      .padding(horizontal = 16.dp, vertical = 10.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.SpaceBetween,
  ) {
    Column {
      Text(
        if (canIPick) "Your turn to pick!" else "${team.captain.name}'s turn to pick",
        color = Color.White,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
      )
      Text(team.name, color = color, style = MaterialTheme.typography.labelMedium)
    }
    DraftTimer(secondsRemaining, totalSeconds)
  }
}

@Composable
fun DraftProgress(drafted: Int, total: Int, modifier: Modifier = Modifier) {
  Column(modifier) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text("Draft progress", color = Color.White.copy(alpha = 0.7f), style = MaterialTheme.typography.labelSmall)
      Text("$drafted of $total", color = Color.White.copy(alpha = 0.7f), style = MaterialTheme.typography.labelSmall)
    }
    Spacer(Modifier.height(4.dp))
    LinearProgressIndicator(
      progress = { if (total == 0) 0f else drafted.toFloat() / total },
      modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(50)),
      color = Color(0xFF34D399),
      trackColor = Color.White.copy(alpha = 0.12f),
    )
  }
}
