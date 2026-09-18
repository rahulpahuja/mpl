package com.mplauction.android.ui.draft

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
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
import com.mplauction.android.ui.common.ConfettiBurst
import kotlinx.coroutines.delay

@Composable
fun DraftTeamRevealScreen(teams: List<DraftTeam>, actionLabel: String, onAction: () -> Unit, modifier: Modifier = Modifier) {
  var showTitle by remember { mutableStateOf(false) }
  var showTeams by remember { mutableStateOf(false) }
  var showConfetti by remember { mutableStateOf(false) }

  LaunchedEffect(Unit) {
    delay(120)
    showTitle = true
    showConfetti = true
    delay(400)
    showTeams = true
  }

  Box(modifier.fillMaxSize()) {
    if (showConfetti) ConfettiBurst(modifier = Modifier.fillMaxSize())

    Column(
      Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      Spacer(Modifier.height(24.dp))
      AnimatedVisibility(showTitle, enter = fadeIn(tween(300)) + scaleIn(initialScale = 0.7f, animationSpec = tween(300))) {
        Text("Teams Ready!", color = Color.White, style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)
      }
      Spacer(Modifier.height(24.dp))
      AnimatedVisibility(showTeams, enter = fadeIn(tween(300)) + slideInVertically(tween(300)) { it / 4 }) {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
          teams.forEachIndexed { index, team -> TeamCard(team, index, isActiveTurn = false, expanded = true) }
        }
      }
      Spacer(Modifier.height(32.dp))
      AnimatedVisibility(showTeams, enter = fadeIn(tween(300))) {
        Button(onClick = onAction) { Text(actionLabel) }
      }
      Spacer(Modifier.height(24.dp))
    }
  }
}
