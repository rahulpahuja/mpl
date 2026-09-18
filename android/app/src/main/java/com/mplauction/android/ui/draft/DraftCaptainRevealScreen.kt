package com.mplauction.android.ui.draft

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SportsCricket
import androidx.compose.material3.Icon
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

// Renders on every joined client once the host confirms captains. Each
// device runs its own local reveal timing, then calls onRevealFinished
// (DraftViewModel.ensureDraftingStarted) — safe to call from more than one
// client at once, since the repository only applies the first one.
@Composable
fun DraftCaptainRevealScreen(captains: List<DraftPlayer>, onRevealFinished: () -> Unit, modifier: Modifier = Modifier) {
  var showFirst by remember { mutableStateOf(false) }
  var showVs by remember { mutableStateOf(false) }
  var showSecond by remember { mutableStateOf(false) }

  LaunchedEffect(captains) {
    showFirst = false
    showVs = false
    showSecond = false
    delay(150)
    showFirst = true
    delay(500)
    showVs = true
    delay(350)
    showSecond = true
    delay(1200)
    onRevealFinished()
  }

  Column(modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
    Icon(Icons.Filled.SportsCricket, contentDescription = null, tint = Color.White.copy(alpha = 0.5f), modifier = Modifier.size(32.dp))
    Text(
      "THE CAPTAINS",
      color = Color.White.copy(alpha = 0.6f),
      style = MaterialTheme.typography.labelLarge,
      fontWeight = FontWeight.Bold,
      modifier = Modifier.padding(top = 8.dp, bottom = 28.dp),
    )
    Row(horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
      AnimatedVisibility(showFirst, enter = fadeIn(tween(300)) + scaleIn(initialScale = 0.6f, animationSpec = tween(300))) {
        captains.getOrNull(0)?.let { CaptainCard(it, 0) }
      }
      AnimatedVisibility(showVs, enter = fadeIn(tween(200)) + scaleIn(initialScale = 0.5f, animationSpec = tween(200))) {
        Text("VS", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
      }
      AnimatedVisibility(showSecond, enter = fadeIn(tween(300)) + scaleIn(initialScale = 0.6f, animationSpec = tween(300))) {
        captains.getOrNull(1)?.let { CaptainCard(it, 1) }
      }
    }
    Text(
      "Draft starting…",
      color = Color.White.copy(alpha = 0.5f),
      style = MaterialTheme.typography.bodyMedium,
      modifier = Modifier.padding(top = 32.dp),
    )
  }
}
