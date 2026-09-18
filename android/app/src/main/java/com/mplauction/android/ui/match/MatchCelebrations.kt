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
import com.mplauction.android.ui.theme.BrandOrange
import kotlinx.coroutines.delay

sealed interface MatchMoment {
  data object Four : MatchMoment
  data object Six : MatchMoment
  data object Wicket : MatchMoment
  data class OverComplete(val inningsNumber: Long, val overNumber: Long) : MatchMoment
}

// Watches Match.lastBall.ballSeq for a transition, like useJustScored.ts —
// lastBall is denormalized onto the match doc precisely so every viewer,
// not just the scorer, reacts to the latest ball. The first observed value
// is only a baseline, so opening a match mid-game doesn't replay a moment.
// Undo never bumps ballSeq, so it can't trigger one either.
@Composable
fun rememberMatchMoments(state: MatchUiState): Pair<MatchMoment?, () -> Unit> {
  val queue = remember { mutableStateListOf<MatchMoment>() }
  var previousSeq by remember { mutableStateOf<Long?>(null) }
  var initialized by remember { mutableStateOf(false) }
  val match = state.match
  val seq = match?.lastBall?.ballSeq

  LaunchedEffect(seq) {
    if (match == null) return@LaunchedEffect
    if (!initialized) {
      initialized = true
      previousSeq = seq
      return@LaunchedEffect
    }
    val last = match.lastBall
    if (last != null && last.ballSeq != previousSeq) {
      when {
        last.isWicket -> queue += MatchMoment.Wicket
        last.isBoundary == 6L -> queue += MatchMoment.Six
        last.isBoundary == 4L -> queue += MatchMoment.Four
      }
      val innings = state.innings
      val legal = last.extraType != ExtraType.wide && last.extraType != ExtraType.noBall
      if (legal && innings != null && innings.completedReason == null && innings.legalBallsBowled > 0 && innings.legalBallsBowled % 6 == 0L) {
        queue += MatchMoment.OverComplete(innings.inningsNumber, innings.legalBallsBowled / 6)
      }
    }
    previousSeq = seq
  }

  return queue.firstOrNull() to { if (queue.isNotEmpty()) queue.removeAt(0) }
}

@Composable
fun MatchMomentOverlay(moment: MatchMoment?, state: MatchUiState, onDone: () -> Unit) {
  val haptic = LocalHapticFeedback.current
  var shown by remember { mutableStateOf(moment) }
  if (moment != null) shown = moment

  // Its own state rather than tied to `moment`: the burst (~2.6s) outlasts
  // the text, and should finish falling instead of vanishing with it. A new
  // count restarts it for back-to-back boundaries.
  var burst by remember { mutableStateOf<Pair<Color, Int>?>(null) }

  LaunchedEffect(moment) {
    if (moment == null) return@LaunchedEffect
    momentColor(moment)?.let { color -> burst = color to (burst?.second ?: 0) + 1 }
    MatchSounds.play(moment)
    if (moment is MatchMoment.Wicket || moment is MatchMoment.Six) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    delay(if (moment is MatchMoment.OverComplete) 2200 else 1500)
    onDone()
  }

  Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
    burst?.let { (color, count) -> ConfettiBurst(Modifier.fillMaxSize(), colors = listOf(color), key = count) }
    AnimatedVisibility(visible = moment != null, enter = fadeIn(tween(150)) + scaleIn(initialScale = 0.5f), exit = fadeOut(tween(200)) + scaleOut(targetScale = 1.2f)) {
      when (val current = shown) {
        MatchMoment.Four -> MomentText("FOUR! 🔥", momentColor(current)!!)
        MatchMoment.Six -> MomentText("SIX! 🚀", momentColor(current)!!)
        MatchMoment.Wicket -> MomentText("WICKET! 💥", momentColor(current)!!)
        is MatchMoment.OverComplete -> OverCompleteCard(current, state)
        null -> Unit
      }
    }
  }
}

// Confetti colour per moment; the over-complete card gets none.
private fun momentColor(moment: MatchMoment): Color? =
  when (moment) {
    MatchMoment.Four -> BoundaryGreen
    MatchMoment.Six -> BrandOrange
    MatchMoment.Wicket -> WicketRed
    is MatchMoment.OverComplete -> null
  }

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
