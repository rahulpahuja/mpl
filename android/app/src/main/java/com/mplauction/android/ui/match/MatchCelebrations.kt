package com.mplauction.android.ui.match

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mplauction.android.data.model.ExtraType
import com.mplauction.android.ui.common.ConfettiBurst
import com.mplauction.android.ui.theme.BrandBlue
import com.mplauction.android.ui.theme.BrandOrange
import kotlinx.coroutines.delay

sealed interface MatchMoment {
  data object Four : MatchMoment
  data object Six : MatchMoment
  data object Wicket : MatchMoment
  data class OverComplete(val inningsNumber: Long, val overNumber: Long) : MatchMoment
  data class Milestone(val playerName: String, val runs: Long) : MatchMoment
}

private val MILESTONES = listOf(100L, 50L, 25L)

// The id makes back-to-back identical moments (FOUR then FOUR) distinct;
// keyed on the moment alone, the overlay's dismiss timer never restarted
// for the second one and it stayed on screen for good.
data class QueuedMoment(val id: Long, val moment: MatchMoment)

// Watches Match.lastBall.ballSeq for a transition, like useJustScored.ts —
// lastBall is denormalized onto the match doc precisely so every viewer,
// not just the scorer, reacts to the latest ball. The first observed value
// is only a baseline, so opening a match mid-game doesn't replay a moment.
// Undo never bumps ballSeq, so it can't trigger one either.
@Composable
fun rememberMatchMoments(state: MatchUiState): Pair<QueuedMoment?, () -> Unit> {
  val queue = remember { mutableStateListOf<QueuedMoment>() }
  var nextId by remember { mutableLongStateOf(0L) }
  fun enqueue(moment: MatchMoment) {
    queue += QueuedMoment(nextId++, moment)
  }
  var previousSeq by remember { mutableStateOf<Long?>(null) }
  // Runs per batter as of the previous snapshot, to spot a 25/50/100 being
  // crossed. Refreshed on every snapshot (including undo, picks), so it
  // never holds a stale total.
  var previousRuns by remember { mutableStateOf<Map<String, Long>?>(null) }
  val match = state.match

  // Keyed on the whole match, not just ballSeq: a match opened before its
  // first ball has no ballSeq yet, and keying on it alone left the first
  // ball as the baseline instead of celebrating it.
  LaunchedEffect(match) {
    if (match == null) return@LaunchedEffect
    val innings = state.innings
    val runsNow = innings?.battingStats?.mapValues { it.value.runs }.orEmpty()
    val baseline = previousRuns
    val last = match.lastBall
    if (baseline != null && last != null && last.ballSeq != previousSeq) {
      when {
        last.isWicket -> enqueue(MatchMoment.Wicket)
        last.isBoundary == 6L -> enqueue(MatchMoment.Six)
        last.isBoundary == 4L -> enqueue(MatchMoment.Four)
      }
      innings?.battingStats?.values?.forEach { bat ->
        val before = baseline[bat.playerId] ?: 0L
        MILESTONES.firstOrNull { before < it && bat.runs >= it }?.let { enqueue(MatchMoment.Milestone(bat.name, it)) }
      }
      val legal = last.extraType != ExtraType.wide && last.extraType != ExtraType.noBall
      if (legal && innings != null && innings.completedReason == null && innings.legalBallsBowled > 0 && innings.legalBallsBowled % 6 == 0L) {
        enqueue(MatchMoment.OverComplete(innings.inningsNumber, innings.legalBallsBowled / 6))
      }
    }
    previousSeq = last?.ballSeq
    previousRuns = runsNow
  }

  return queue.firstOrNull() to { if (queue.isNotEmpty()) queue.removeAt(0) }
}

@Composable
fun MatchMomentOverlay(queued: QueuedMoment?, state: MatchUiState, onDone: () -> Unit) {
  val moment = queued?.moment
  val haptic = LocalHapticFeedback.current
  var shown by remember { mutableStateOf(moment) }
  if (moment != null) shown = moment

  // Its own state rather than tied to `moment`: the burst (~2.6s) outlasts
  // the text, and should finish falling instead of vanishing with it. A new
  // count restarts it for back-to-back boundaries.
  var burst by remember { mutableStateOf<Pair<Color, Int>?>(null) }

  LaunchedEffect(queued?.id) {
    if (moment == null) return@LaunchedEffect
    momentColor(moment)?.let { color -> burst = color to (burst?.second ?: 0) + 1 }
    MatchSounds.play(moment)
    if (moment is MatchMoment.Wicket || moment is MatchMoment.Six || moment is MatchMoment.Milestone) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    delay(if (moment is MatchMoment.OverComplete || moment is MatchMoment.Milestone) 2200 else 1500)
    onDone()
  }

  Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
    // While a moment is up, a dim layer swallows every tap, so a nervous
    // double/triple tap on the pad can't record extra balls behind it.
    if (moment != null) {
      Box(
        Modifier.fillMaxSize()
          .background(Color.Black.copy(alpha = 0.35f))
          .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {},
      )
    }
    burst?.let { (color, count) -> ConfettiBurst(Modifier.fillMaxSize(), colors = listOf(color), key = count) }
    AnimatedVisibility(visible = moment != null, enter = fadeIn(tween(150)) + scaleIn(initialScale = 0.5f), exit = fadeOut(tween(200)) + scaleOut(targetScale = 1.2f)) {
      when (val current = shown) {
        MatchMoment.Four -> MomentText("FOUR! 🔥", momentColor(current)!!)
        MatchMoment.Six -> MomentText("SIX! 🚀", momentColor(current)!!)
        MatchMoment.Wicket -> MomentText("WICKET! 💥", momentColor(current)!!)
        is MatchMoment.OverComplete -> OverCompleteCard(current, state)
        is MatchMoment.Milestone -> MilestoneCard(current, momentColor(current)!!)
        null -> Unit
      }
    }
  }
}

private fun milestoneTitle(runs: Long) =
  when (runs) {
    100L -> "CENTURY! 💯"
    50L -> "FIFTY! 🏏"
    else -> "$runs UP! 🏏"
  }

@Composable
private fun MilestoneCard(moment: MatchMoment.Milestone, color: Color) {
  Column(
    Modifier.clip(MaterialTheme.shapes.extraLarge).background(color.copy(alpha = 0.94f)).padding(horizontal = 28.dp, vertical = 16.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text(milestoneTitle(moment.runs), color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Black)
    Text(moment.playerName, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
  }
}

// Confetti colour per moment; the over-complete card gets none.
private fun momentColor(moment: MatchMoment): Color? =
  when (moment) {
    MatchMoment.Four -> BoundaryGreen
    MatchMoment.Six -> BrandOrange
    MatchMoment.Wicket -> WicketRed
    is MatchMoment.Milestone -> if (moment.runs >= 50) MilestoneGold else BrandBlue
    is MatchMoment.OverComplete -> null
  }

private val MilestoneGold = Color(0xFFD4A017)

@Composable
private fun MomentText(text: String, color: Color) {
  Text(
    text,
    color = Color.White,
    fontSize = 44.sp,
    fontWeight = FontWeight.Black,
    modifier = Modifier.clip(MaterialTheme.shapes.extraLarge).background(color.copy(alpha = 0.92f)).padding(horizontal = 28.dp, vertical = 14.dp),
  )
}

@Composable
private fun OverCompleteCard(moment: MatchMoment.OverComplete, state: MatchUiState) {
  val innings = state.innings
  val overRuns = state.ballsFor(moment.inningsNumber).filter { it.overNumber == moment.overNumber - 1 }.sumOf { it.runs + it.extraRuns }
  Column(
    Modifier.clip(MaterialTheme.shapes.extraLarge).background(Color(0xF0111827)).padding(horizontal = 32.dp, vertical = 20.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.spacedBy(4.dp),
  ) {
    Text("OVER COMPLETE", color = BrandOrange, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
    Text("Over ${moment.overNumber}", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
    if (innings != null) Text("${state.battingSide?.label()}: ${innings.scoreLine()}", color = Color.White)
    Text("This over: $overRuns run${if (overRuns == 1L) "" else "s"}", color = MatchTextDim)
  }
}

// Shown to everyone the moment status flips toss -> live: the toss outcome,
// then a 3-2-1 count into play.
@Composable
fun MatchStartingOverlay(tossSummary: String, onDone: () -> Unit) {
  var step by remember { mutableStateOf(tossSummary) }
  LaunchedEffect(Unit) {
    delay(1800)
    for (n in listOf("3", "2", "1")) {
      step = n
      delay(700)
    }
    step = "PLAY BALL"
    delay(900)
    onDone()
  }
  Box(Modifier.fillMaxSize().background(Color(0xF20B0F1A)), contentAlignment = Alignment.Center) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
      Text("MATCH STARTING", color = MatchTextDim, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
      AnimatedContent(step, transitionSpec = { (fadeIn(tween(200)) + scaleIn(initialScale = 0.4f)) togetherWith fadeOut(tween(150)) }, label = "match-start") { text ->
        Text(
          text,
          color = if (text == "PLAY BALL") BrandOrange else Color.White,
          fontSize = if (text.length <= 2) 96.sp else 30.sp,
          fontWeight = FontWeight.Black,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(horizontal = 24.dp),
        )
      }
    }
  }
}
