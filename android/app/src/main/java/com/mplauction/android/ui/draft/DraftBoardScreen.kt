package com.mplauction.android.ui.draft

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

// The main gamification screen: turn indicator + timer up top, both teams
// side-by-side, and the available-players pool below. LazyVerticalGrid's
// animateItem() closes the gap when a card leaves the pool, and a small
// toast + haptic mark every pick without a full confetti burst (that's
// reserved for the final reveal — see DraftTeamRevealScreen).
//
// secondsRemaining is derived here, not in the ViewModel: timerEndsAtMillis
// is the one synced value every device agrees on, and each device ticks its
// own display off it plus its own clock — a phone that was backgrounded
// catches up correctly on resume instead of replaying a stale countdown.
@Composable
fun DraftBoardScreen(state: DraftUiState, onPick: (DraftPlayer) -> Unit, onCheckTimerExpiry: () -> Unit, modifier: Modifier = Modifier) {
  val haptic = LocalHapticFeedback.current
  val teams = state.teams
  if (teams.size < 2) return

  var secondsRemaining by remember { mutableStateOf(state.turnSeconds) }
  LaunchedEffect(state.timerEndsAtMillis) {
    val deadline = state.timerEndsAtMillis
    while (deadline != null) {
      val remainingMs = deadline - System.currentTimeMillis()
      secondsRemaining = (remainingMs / 1000f).let { if (it > 0f) kotlin.math.ceil(it).toInt() else 0 }
      if (remainingMs <= 0) onCheckTimerExpiry()
      delay(400)
    }
  }

  var toast by remember { mutableStateOf<String?>(null) }
  LaunchedEffect(state.lastPick?.token) {
    val pick = state.lastPick ?: return@LaunchedEffect
    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    val teamName = teams.getOrNull(pick.teamIndex)?.name.orEmpty()
    toast = "${pick.player.name} joins $teamName" + if (pick.auto) " (auto-picked)" else ""
    delay(1100)
    toast = null
  }

  Box(modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
      DraftTurnIndicator(
        team = teams[state.turnIndex],
        teamIndex = state.turnIndex,
        secondsRemaining = secondsRemaining,
        totalSeconds = state.turnSeconds,
        canIPick = state.canIPick,
      )

      Spacer(Modifier.height(12.dp))
      DraftProgress(drafted = state.draftedCount, total = state.draftedCount + state.pool.size)

      Spacer(Modifier.height(16.dp))
      Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        TeamCard(teams[0], 0, isActiveTurn = state.turnIndex == 0, modifier = Modifier.weight(1f))
        TeamCard(teams[1], 1, isActiveTurn = state.turnIndex == 1, modifier = Modifier.weight(1f))
      }

      Spacer(Modifier.height(20.dp))
      Text(
        if (state.canIPick) "Available players — tap to draft" else "Available players",
        color = Color.White.copy(alpha = 0.7f),
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
      )
      Spacer(Modifier.height(8.dp))

      LazyVerticalGrid(
        columns = GridCells.Adaptive(84.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.weight(1f),
      ) {
        items(state.pool, key = { it.id }) { player ->
          PlayerCard(player, modifier = Modifier.animateItem(), onClick = { if (state.canIPick) onPick(player) })
        }
      }
    }

    AnimatedVisibility(
      visible = toast != null,
      enter = fadeIn(tween(180)) + slideInVertically(tween(180)) { -it / 2 },
      exit = fadeOut(tween(180)) + slideOutVertically(tween(180)) { -it / 2 },
      modifier = Modifier.align(Alignment.TopCenter).padding(top = 90.dp),
    ) {
      toast?.let { PickToast(it) }
    }
  }
}

@Composable
private fun PickToast(text: String) {
  Row(
    Modifier
      .clip(RoundedCornerShape(50))
      .background(Color.Black.copy(alpha = 0.85f))
      .padding(horizontal = 18.dp, vertical = 10.dp),
  ) {
    Text(text, color = Color.White, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
  }
}
