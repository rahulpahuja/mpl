package com.mplauction.android.ui.auction

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.Player
import com.mplauction.android.data.model.PlayerStatus
import com.mplauction.android.data.model.TeamManagerEntry
import com.mplauction.android.ui.common.ConfettiBurst
import com.mplauction.android.ui.common.PlayerAvatar
import com.mplauction.android.ui.common.TeamAvatar
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Every player who just sold together (more than one when the lead player —
// the one that was currentPlayerId — is part of a combo lot) plus the team
// that won them. Mirrors useJustSoldPlayer.ts exactly, including its
// currentPlayerId-transition detection: markSold clears currentPlayerId back
// to null in the same write that flips status to 'sold', so this only fires
// once per sale, not on every bid.
data class JustSoldPlayer(val players: List<Player>, val team: TeamManagerEntry?)

@Composable
fun rememberJustSoldPlayer(auction: Auction?): Pair<JustSoldPlayer?, () -> Unit> {
  var sold by remember { mutableStateOf<JustSoldPlayer?>(null) }
  var prevPlayerId by remember { mutableStateOf<String?>(null) }
  var initialized by remember { mutableStateOf(false) }

  LaunchedEffect(auction) {
    val current = auction ?: return@LaunchedEffect
    val prevId = prevPlayerId
    val currentId = current.currentPlayerId
    if (!initialized) {
      initialized = true
      prevPlayerId = currentId
      return@LaunchedEffect
    }
    if (prevId != null && prevId != currentId) {
      val player = current.players.find { it.playerId == prevId }
      if (player != null && player.status == PlayerStatus.sold) {
        val players =
          player.comboId?.let { comboId ->
            current.players.filter { it.comboId == comboId && it.status == PlayerStatus.sold && it.currentBidder == player.currentBidder }
          } ?: listOf(player)
        sold = JustSoldPlayer(players, current.teamManagers.find { it.managerId == player.currentBidder })
      }
    }
    prevPlayerId = currentId
  }

  return sold to { sold = null }
}

private const val AUTO_DISMISS_MS = 3800L

// Full-screen "SOLD!" moment: confetti burst, the sale price, and the
// winning team's reveal — the auction's main event, so unlike the rest of
// the app it gets a dedicated celebration rather than a quiet state update.
// Ported from SoldCelebration.tsx; the fanfare sound isn't (no audio asset
// to port yet).
@Composable
fun SoldCelebrationOverlay(sold: JustSoldPlayer, onDismiss: () -> Unit) {
  LaunchedEffect(sold) {
    delay(AUTO_DISMISS_MS)
    onDismiss()
  }

  val stampScale = remember(sold) { Animatable(0.4f) }
  LaunchedEffect(sold) {
    launch { stampScale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)) }
  }

  val jerseyColor = sold.team?.jerseyColor?.let { runCatching { Color(android.graphics.Color.parseColor(it)) }.getOrNull() }

  Box(
    Modifier
      .fillMaxSize()
      .background(Color.Black.copy(alpha = 0.85f))
      .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onDismiss),
    contentAlignment = Alignment.Center,
  ) {
    ConfettiBurst(modifier = Modifier.fillMaxSize(), colors = listOfNotNull(jerseyColor), key = sold)

    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
      Text(
        "SOLD!",
        fontSize = 56.sp,
        fontWeight = FontWeight.Black,
        color = Color(0xFFFBBF24),
        modifier = Modifier.graphicsLayer { scaleX = stampScale.value; scaleY = stampScale.value },
      )

      val isCombo = sold.players.size > 1
      val totalPrice = sold.players.sumOf { if (it.currentBid > 0) it.currentBid else it.basePrice }

      Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        sold.players.take(4).forEach { p -> PlayerAvatar(p.photoURL, p.avatarId, p.name, size = 56.dp) }
      }
      Text(
        sold.players.joinToString(", ") { it.name },
        color = Color.White,
        style = MaterialTheme.typography.titleMedium,
        textAlign = TextAlign.Center,
        modifier = Modifier.padding(top = 8.dp),
      )
      Text(totalPrice.toString(), color = Color.White, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(top = 4.dp))
      if (isCombo) {
        Text(
          "Combo of ${sold.players.size} · split equally",
          color = Color.White.copy(alpha = 0.7f),
          style = MaterialTheme.typography.labelSmall,
        )
      }

      sold.team?.let { team ->
        Row(
          Modifier
            .padding(top = 12.dp)
            .background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(50))
            .padding(horizontal = 16.dp, vertical = 8.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          TeamAvatar(team.logoImage, team.logoId, team.name, size = 28.dp)
          Text(team.managerName ?: team.name, color = Color.White, style = MaterialTheme.typography.bodyMedium)
        }
      }

      Text(
        "Tap anywhere to continue",
        color = Color.White.copy(alpha = 0.5f),
        style = MaterialTheme.typography.labelSmall,
        modifier = Modifier.padding(top = 24.dp),
      )
    }
  }
}
