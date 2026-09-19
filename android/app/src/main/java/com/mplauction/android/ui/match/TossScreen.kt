package com.mplauction.android.ui.match

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mplauction.android.data.MatchRules
import com.mplauction.android.data.model.CoinSide
import com.mplauction.android.data.model.TossDecision
import com.mplauction.android.ui.common.PlayerAvatar
import com.mplauction.android.ui.draft.DraftPlayer
import com.mplauction.android.ui.draft.draftTeamColor
import com.mplauction.android.ui.theme.BrandBlue
import com.mplauction.android.ui.theme.BrandOrange
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

private const val FLIP_MS = 2400

// A flip older than this (a viewer opening the screen late, or clock skew
// between phones) is shown already landed rather than replayed.
private const val REPLAY_WINDOW_MS = 10_000L

// Share of the animation spent in the air; the rest is the landing bounce.
private const val AIRBORNE = 0.86f
private val TOSS_HEIGHT = 120.dp
private val COIN_SIZE = 96.dp

private val CoinGold = Color(0xFFFACC15)
private val CoinGoldDark = Color(0xFFCA8A04)

// Half-turns end over end: even lands heads-up, odd tails-up. The spin
// count varies per toss but comes from the stored flippedAt, so every
// device plays exactly the same toss.
private fun halfTurns(flippedAt: Long, outcome: CoinSide): Int = 2 * (7 + (flippedAt % 4).toInt()) + if (outcome == CoinSide.tails) 1 else 0

// Driven entirely by Match.coinToss: the scorer's call writes the outcome,
// and every open device — scorer and viewers alike — animates the same flip
// from that shared state. Team B's captain calls, as the visiting side
// traditionally does; only the toss winner's scorer gets BAT/BOWL.
@Composable
fun TossScreen(
  state: MatchUiState,
  onCall: (callerTeamId: String, call: CoinSide) -> Unit,
  onDecide: (wonByTeamId: String, decision: TossDecision) -> Unit,
  modifier: Modifier = Modifier,
) {
  val match = state.match ?: return
  val captainA = state.player(match.teamA.captainId.orEmpty())
  val captainB = state.player(match.teamB.captainId.orEmpty())
  val coin = match.coinToss

  val progress = remember { Animatable(0f) }
  var landed by remember { mutableStateOf(false) }
  LaunchedEffect(coin?.flippedAt) {
    if (coin == null) return@LaunchedEffect
    if (abs(System.currentTimeMillis() - coin.flippedAt) < REPLAY_WINDOW_MS) {
      progress.snapTo(0f)
      progress.animateTo(1f, tween(FLIP_MS, easing = LinearEasing))
    } else {
      progress.snapTo(1f)
    }
    landed = true
  }

  // Sized to fit one phone screen: compact captain badges and a shorter toss
  // arc; the scroll is only a fallback for very short screens.
  Column(
    modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.spacedBy(10.dp),
  ) {
    Text("TIME FOR THE TOSS", color = MatchTextDim, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
      CaptainBadge(captainA, 0, Modifier.weight(1f))
      Text("VS", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
      CaptainBadge(captainB, 1, Modifier.weight(1f))
    }

    TossedCoin(progress.value, coin?.let { halfTurns(it.flippedAt, it.outcome) } ?: 0)

    when {
      coin == null && !state.canScore -> Text("Waiting for the scorer to toss the coin…", color = MatchTextDim, textAlign = TextAlign.Center)
      coin == null -> {
        Text("${captainB.name}, call it!", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
          CoinSide.entries.forEach { side ->
            Button(onClick = { onCall(match.teamB.teamId, side) }, enabled = !state.busy, modifier = Modifier.heightIn(min = 52.dp)) {
              Text(side.name.uppercase(), fontWeight = FontWeight.Bold)
            }
          }
        }
        Text("Tap a side to toss the coin", color = MatchTextDim, style = MaterialTheme.typography.bodySmall)
      }
      !landed -> Text("${captainB.name} called ${coin.call.name.uppercase()}…", color = Color.White, style = MaterialTheme.typography.titleMedium)
      else -> {
        val winnerTeamId = MatchRules.coinTossWinner(match.teamA, match.teamB, coin)
        val winnerName = state.side(winnerTeamId)?.let(state::captainName).orEmpty()
        TossResult(
          outcome = coin.outcome,
          callerName = captainB.name,
          call = coin.call,
          winnerName = winnerName,
          canDecide = state.canScore,
          busy = state.busy,
          onDecide = { decision -> onDecide(winnerTeamId, decision) },
        )
      }
    }
    state.error?.let { Text(it, color = WicketRed, style = MaterialTheme.typography.bodySmall) }
  }
}

@Composable
private fun CaptainBadge(player: DraftPlayer, teamIndex: Int, modifier: Modifier = Modifier) {
  val color = draftTeamColor(teamIndex)
  Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
    Box(Modifier.size(64.dp).clip(CircleShape).border(2.dp, color, CircleShape).padding(3.dp)) {
      PlayerAvatar(photoURL = player.photoURL, avatarId = player.avatarId, name = player.name, size = 58.dp)
    }
    Text(player.name, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
    Text("CAPTAIN ${teamIndex + 1}", color = color, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
  }
}

@Composable
private fun TossResult(outcome: CoinSide, callerName: String, call: CoinSide, winnerName: String, canDecide: Boolean, busy: Boolean, onDecide: (TossDecision) -> Unit) {
  val appear = remember { MutableTransitionState(false).apply { targetState = true } }
  AnimatedVisibility(appear, enter = fadeIn(tween(250)) + scaleIn(initialScale = 0.6f)) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Text(outcome.name.uppercase(), color = CoinGold, fontSize = 32.sp, fontWeight = FontWeight.Black)
      Text("$callerName called ${call.name.uppercase()}", color = MatchTextDim)
      Text("$winnerName wins the toss!", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
      Spacer(Modifier.height(4.dp))
      if (!canDecide) {
        Text("Waiting for $winnerName to choose…", color = MatchTextDim)
        return@Column
      }
      Text("What do you choose?", color = MatchTextDim)
      Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Button(
          onClick = { onDecide(TossDecision.bat) },
          enabled = !busy,
          colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
          modifier = Modifier.heightIn(min = 56.dp),
        ) {
          Text("BAT FIRST", fontWeight = FontWeight.Bold)
        }
        OutlinedButton(
          onClick = { onDecide(TossDecision.bowl) },
          enabled = !busy,
          colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandOrange),
          border = BorderStroke(1.dp, BrandOrange),
          modifier = Modifier.heightIn(min = 56.dp),
        ) {
          Text("BOWL FIRST", fontWeight = FontWeight.Bold)
        }
      }
    }
  }
}

// A real toss: the coin rises and falls on an arc, tumbling end over end
// (rotationX) and growing toward its apex as it nears the viewer, slows its
// spin as it drops, then settles with a small bounce. A ground shadow
// shrinks and fades while it's airborne.
@Composable
private fun TossedCoin(progress: Float, halfTurns: Int) {
  val air = (progress / AIRBORNE).coerceAtMost(1f)
  val arc = sin(PI * air).toFloat()
  val bounce = if (progress > AIRBORNE) sin(PI * (progress - AIRBORNE) / (1 - AIRBORNE)).toFloat() * 0.07f else 0f
  val angle = FastOutSlowInEasing.transform(air) * halfTurns * 180f
  val normalized = angle % 360f
  val showingTails = normalized in 90f..270f

  Box(Modifier.size(width = COIN_SIZE * 1.6f, height = COIN_SIZE + TOSS_HEIGHT), contentAlignment = Alignment.BottomCenter) {
    Box(
      Modifier
        .size(width = COIN_SIZE * (1f - 0.45f * arc), height = 14.dp)
        .graphicsLayer { alpha = 0.35f * (1f - 0.7f * arc) }
        .clip(CircleShape)
        .background(Color.Black),
    )
    Box(
      Modifier
        .padding(bottom = 8.dp)
        .size(COIN_SIZE)
        .graphicsLayer {
          translationY = -(arc + bounce) * TOSS_HEIGHT.toPx()
          val scale = 1f + 0.3f * arc
          scaleX = scale
          scaleY = scale
          rotationX = angle
          cameraDistance = 14f * density
        }
        .clip(CircleShape)
        .background(Brush.radialGradient(listOf(CoinGold, CoinGoldDark)))
        .border(5.dp, CoinGoldDark, CircleShape)
        .padding(10.dp)
        .border(2.dp, CoinGoldDark.copy(alpha = 0.6f), CircleShape),
      contentAlignment = Alignment.Center,
    ) {
      // The back face is drawn mirrored by rotationX, so flip it back to read.
      Text(
        if (showingTails) "T" else "H",
        color = Color(0xFF713F12),
        fontSize = 40.sp,
        fontWeight = FontWeight.Black,
        modifier = Modifier.graphicsLayer { rotationX = if (showingTails) 180f else 0f },
      )
    }
  }
}
