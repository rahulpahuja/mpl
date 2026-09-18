package com.mplauction.android.ui.match

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mplauction.android.data.MatchRules
import com.mplauction.android.data.MatchStatFormat
import com.mplauction.android.data.model.ExtraType
import com.mplauction.android.data.model.InningsState
import com.mplauction.android.data.model.Match
import com.mplauction.android.data.model.MatchStatus
import com.mplauction.android.ui.draft.DraftPlayer
import com.mplauction.android.ui.draft.PlayerCard
import com.mplauction.android.ui.draft.draftTeamColor
import com.mplauction.android.ui.theme.BrandOrange

// Bundles the LIVE tab's callbacks, same reason as DraftLobbyActions.
data class LiveActions(
  val onScore: (runs: Long, extraType: ExtraType?) -> Unit,
  val onWicket: (WicketInput, ExtraType?) -> Unit,
  val onUndo: () -> Unit,
  val onPickBatsman: (DraftPlayer) -> Unit,
  val onPickBowler: (DraftPlayer) -> Unit,
  val onStartSecondInnings: () -> Unit,
)

private val ExtraAmber = Color(0xFFF59E0B)

@Composable
fun LiveTab(state: MatchUiState, actions: LiveActions, modifier: Modifier = Modifier) {
  val match = state.match ?: return
  val innings = state.innings
  when {
    match.status == MatchStatus.completed || match.status == MatchStatus.abandoned ->
      Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) { MatchResultView(state) }
    match.status == MatchStatus.inningsBreak ->
      Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) { InningsBreakCard(state, actions.onStartSecondInnings) }
    innings != null ->
      // The ball-entry controls sit in a fixed bottom section so recording
      // a delivery never needs a scroll; only the scoreboard above them
      // scrolls, and only on a very short screen.
      Column(modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          ScoreHeader(state, match, innings)
          CreaseCard(innings)
        }
        when {
          state.needsBatsman ->
            PlayerPicker(state, innings, if (innings.battingStats.isEmpty()) "Pick the opening batsman" else "NEW BATSMAN", state.eligibleBatsmen, actions.onPickBatsman, actions.onUndo)
          state.needsBowler ->
            PlayerPicker(state, innings, if (innings.legalBallsBowled == 0L) "Pick the opening bowler" else "NEXT OVER — pick the bowler", state.eligibleBowlers, actions.onPickBowler, actions.onUndo)
          state.canScore -> ScoringPad(state, innings, actions)
        }
        state.error?.let { Text(it, color = WicketRed, style = MaterialTheme.typography.bodySmall) }
      }
  }
}

@Composable
private fun LiveBadge() {
  val pulse by rememberInfiniteTransition(label = "live").animateFloat(0.3f, 1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "live-dot")
  Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
    Box(Modifier.size(8.dp).alpha(pulse).clip(CircleShape).background(WicketRed))
    Text("LIVE", color = WicketRed, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Black)
  }
}

@Composable
private fun ScoreHeader(state: MatchUiState, match: Match, innings: InningsState) {
  MatchCard {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
      LiveBadge()
      if (innings.isFreeHit) {
        Text("FREE HIT", color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, modifier = Modifier.clip(CircleShape).background(ExtraAmber).padding(horizontal = 10.dp, vertical = 2.dp))
      }
      Text(if (innings.inningsNumber == 1L) "1st innings" else "2nd innings", color = MatchTextDim, style = MaterialTheme.typography.labelMedium)
    }
    Text(
      state.battingSide?.label().orEmpty(),
      color = draftTeamColor(state.teamIndex(innings.battingTeamId)),
      style = MaterialTheme.typography.titleSmall,
      fontWeight = FontWeight.Bold,
      maxLines = 1,
      overflow = TextOverflow.Ellipsis,
    )
    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      Text(innings.scoreLine(), color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black)
      Column(Modifier.padding(bottom = 6.dp)) {
        Text(innings.oversLine(match.oversLimit), color = MatchTextDim, style = MaterialTheme.typography.labelLarge)
        Text("CRR ${innings.runRate().fmt()}", color = Color.White, style = MaterialTheme.typography.labelLarge)
      }
    }
    innings.target?.let { target ->
      val needed = (target - innings.totalRuns).coerceAtLeast(0)
      val ballsLeft = (match.oversLimit * 6 - innings.legalBallsBowled).coerceAtLeast(0)
      val rrr = if (ballsLeft > 0) needed / (ballsLeft / 6.0) else null
      Text(
        "TARGET $target · RRR ${rrr.fmt()} · $needed needed from $ballsLeft ball${if (ballsLeft == 1L) "" else "s"}",
        color = if (ballsLeft <= 12) BrandOrange else Color.White,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
      )
    }
  }
}

@Composable
private fun CreaseCard(innings: InningsState) {
  MatchCard {
    listOfNotNull(innings.strikerId, innings.nonStrikerId).forEach { id ->
      val stat = innings.battingStats[id] ?: return@forEach
      val striker = id == innings.strikerId
      Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(
          if (striker) "${stat.name} 🏏" else stat.name,
          color = Color.White,
          fontWeight = if (striker) FontWeight.Bold else FontWeight.Normal,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
          modifier = Modifier.weight(1f),
        )
        Text("${stat.runs} (${stat.balls})", color = Color.White, fontWeight = FontWeight.Bold)
        Text(
          "  ${stat.fours}×4 ${stat.sixes}×6 SR ${MatchStatFormat.strikeRate(stat.runs, stat.balls).fmt(0)}",
          color = MatchTextDim,
          style = MaterialTheme.typography.labelSmall,
        )
      }
    }
    innings.currentBowlerId?.let { id -> innings.bowlingStats[id] }?.let { b ->
      Row(Modifier.fillMaxWidth().padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Text("Bowling: ${b.name}", color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
        Text("${MatchRules.formatOvers(b.legalBalls)}-${b.maidens}-${b.runsConceded}-${b.wickets}", color = Color.White, fontWeight = FontWeight.Bold)
        Text("  Econ ${MatchStatFormat.economyRate(b.runsConceded, b.legalBalls).fmt(1)}", color = MatchTextDim, style = MaterialTheme.typography.labelSmall)
      }
    }
    Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
      SectionLabel("THIS OVER")
      if (innings.currentOverBalls.isEmpty()) Text("New over", color = MatchTextDim, style = MaterialTheme.typography.bodySmall)
      innings.currentOverBalls.forEach { BallChip(it.runs, it.extraType, it.isWicket) }
    }
  }
}

@Composable
private fun PlayerPicker(state: MatchUiState, innings: InningsState, title: String, candidates: List<DraftPlayer>, onPick: (DraftPlayer) -> Unit, onUndo: () -> Unit) {
  MatchCard {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
      Text(title, color = BrandOrange, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
      if (state.canScore) UndoButton(state, innings, onUndo, Modifier.height(40.dp))
    }
    when {
      !state.canScore -> Text("Waiting for the scorer…", color = MatchTextDim, modifier = Modifier.padding(top = 6.dp))
      candidates.isEmpty() -> Text("No eligible players left.", color = MatchTextDim, modifier = Modifier.padding(top = 6.dp))
      else ->
        LazyRow(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
          items(candidates, key = { it.id }) { player -> PlayerCard(player, onClick = { if (!state.busy) onPick(player) }) }
        }
    }
  }
}

private val EXTRA_OPTIONS = listOf(ExtraType.wide to "WIDE", ExtraType.noBall to "NO BALL", ExtraType.bye to "BYE", ExtraType.legBye to "LEG BYE")
private val RUN_OPTIONS = listOf(0L, 1L, 2L, 3L, 4L, 6L)

private fun runsLabel(extraType: ExtraType?) =
  when (extraType) {
    ExtraType.wide -> "Wide (+1) — extra runs run"
    ExtraType.noBall -> "No ball (+1) — runs off the bat"
    ExtraType.bye -> "Byes"
    ExtraType.legBye -> "Leg byes"
    else -> "Runs"
  }

// Undo is instant within the current over; confirming only when it would
// reopen the previous over (the last ball completed it) — the one case
// where a mis-tap loses more than a single delivery's context.
@Composable
private fun UndoButton(state: MatchUiState, innings: InningsState, onUndo: () -> Unit, modifier: Modifier = Modifier) {
  var confirm by remember { mutableStateOf(false) }
  val snapshot = state.match?.undoSnapshot
  val crossesOver = snapshot?.innings?.let { it.legalBallsBowled / 6 < innings.legalBallsBowled / 6 } == true
  OutlinedButton(
    onClick = { if (crossesOver) confirm = true else onUndo() },
    enabled = !state.busy && snapshot != null,
    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
    modifier = modifier,
  ) {
    Text("UNDO", fontWeight = FontWeight.Bold)
  }
  if (confirm) {
    AlertDialog(
      onDismissRequest = { confirm = false },
      title = { Text("Undo the last delivery?") },
      text = { Text("It completed the over, so undoing it goes back into the previous over.") },
      confirmButton = { TextButton(onClick = { onUndo(); confirm = false }) { Text("Undo") } },
      dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancel") } },
    )
  }
}

// One-handed pad: a delivery is one tap (runs) or two (extra, then runs).
// The extra toggle resets after every ball so it can't leak into the next.
@Composable
private fun ScoringPad(state: MatchUiState, innings: InningsState, actions: LiveActions) {
  var extra by remember { mutableStateOf<ExtraType?>(null) }
  var showWicket by remember { mutableStateOf(false) }
  val enabled = !state.busy

  Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
      EXTRA_OPTIONS.forEach { (type, label) ->
        val selected = extra == type
        OutlinedButton(
          onClick = { extra = if (selected) null else type },
          enabled = enabled,
          colors = ButtonDefaults.outlinedButtonColors(containerColor = if (selected) ExtraAmber else Color.Transparent, contentColor = Color.White),
          border = BorderStroke(1.dp, if (selected) ExtraAmber else Color.White.copy(alpha = 0.3f)),
          contentPadding = PaddingValues(horizontal = 2.dp),
          modifier = Modifier.weight(1f).height(40.dp),
        ) {
          Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, maxLines = 1)
        }
      }
    }
    SectionLabel(runsLabel(extra))
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
      RUN_OPTIONS.forEach { runs ->
        val boundary = extra == null && runs >= 4
        Button(
          onClick = {
            actions.onScore(runs, extra)
            extra = null
          },
          enabled = enabled,
          colors = ButtonDefaults.buttonColors(containerColor = if (boundary) BoundaryGreen else Color.White.copy(alpha = 0.12f), contentColor = Color.White),
          contentPadding = PaddingValues(0.dp),
          modifier = Modifier.weight(1f).height(58.dp),
        ) {
          Text("$runs", fontSize = 24.sp, fontWeight = FontWeight.Black)
        }
      }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      Button(
        onClick = { showWicket = true },
        enabled = enabled,
        colors = ButtonDefaults.buttonColors(containerColor = WicketRed),
        modifier = Modifier.weight(2f).height(50.dp),
      ) {
        Text("WICKET", fontWeight = FontWeight.Black)
      }
      UndoButton(state, innings, actions.onUndo, Modifier.weight(1f).height(50.dp))
    }
  }

  if (showWicket) {
    WicketDialog(
      innings = innings,
      extraType = extra,
      fielders = state.bowlingSide?.playingXI.orEmpty().map(state::player),
      onDismiss = { showWicket = false },
      onConfirm = { input ->
        actions.onWicket(input, extra)
        extra = null
        showWicket = false
      },
    )
  }
}

@Composable
private fun InningsBreakCard(state: MatchUiState, onStart: () -> Unit) {
  val match = state.match ?: return
  val first = match.innings1 ?: return
  val battingName = state.side(first.battingTeamId)?.label().orEmpty()
  val chasingName = state.side(first.bowlingTeamId)?.label().orEmpty()
  val target = first.totalRuns + 1
  MatchCard {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
      Text("INNINGS BREAK", color = BrandOrange, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
      Text(battingName, color = Color.White, style = MaterialTheme.typography.titleMedium)
      Text(first.scoreLine(), color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Black)
      Text("${MatchRules.formatOvers(first.legalBallsBowled)} overs", color = MatchTextDim)
      Text("TARGET", color = MatchTextDim, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 10.dp))
      Text("$target runs", color = BrandOrange, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
      Text("$chasingName needs $target runs to win.", color = Color.White)
      if (state.canScore) {
        Button(onClick = onStart, enabled = !state.busy, modifier = Modifier.padding(top = 12.dp).height(52.dp)) {
          Text("START SECOND INNINGS", fontWeight = FontWeight.Bold)
        }
      } else {
        Text("Waiting for the second innings to start…", color = MatchTextDim, modifier = Modifier.padding(top = 12.dp))
      }
    }
  }
}
