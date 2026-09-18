package com.mplauction.android.ui.draft

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.DraftMatchStatus
import com.mplauction.android.ui.common.GradientTopBar

// Also the backdrop for the live match (ui/match/MatchScreen) that follows a draft.
val DraftBackgroundBrush = Brush.verticalGradient(listOf(Color(0xFF0B0F1A), Color(0xFF12172A), Color(0xFF0B0F1A)))

private fun phaseTitle(state: DraftUiState) =
  when {
    !state.found -> "Match not found"
    state.phase == DraftMatchStatus.lobby -> state.matchName.ifBlank { "Match Lobby" }
    state.phase == DraftMatchStatus.captainReveal -> "Captains"
    state.phase == DraftMatchStatus.drafting -> "Team Draft"
    else -> "Teams Ready"
  }

// Entry point pushed from the Matches tab for one specific match. A dark,
// full-bleed body under the brand top bar — meant to read as a distinct
// "event" mode, the same way SoldCelebrationOverlay breaks from the rest of
// the app's light theme for the auction's big moment. onLetsPlay reports
// whether the viewer is the host (who sets up the match) or a participant
// (who goes straight to watching it).
@Composable
fun DraftScreen(
  matchId: String,
  currentUser: AppUser,
  onExit: () -> Unit,
  onImportPlayers: () -> Unit,
  onLetsPlay: (isHost: Boolean) -> Unit,
  modifier: Modifier = Modifier,
) {
  val container = LocalContext.current.appContainer()
  val viewModel: DraftViewModel =
    viewModel(key = "draft-$matchId") { DraftViewModel(container.draftMatchRepository, container.userRepository, matchId, currentUser) }
  val state by viewModel.uiState.collectAsStateWithLifecycle()

  Scaffold(
    modifier = modifier,
    containerColor = Color(0xFF0B0F1A),
    topBar = { GradientTopBar(title = phaseTitle(state), onBack = onExit) },
  ) { innerPadding ->
    Box(Modifier.fillMaxSize().padding(innerPadding).background(DraftBackgroundBrush)) {
      when {
        state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color.White) }
        !state.found ->
          Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("This match doesn't exist, or the link is wrong.", color = Color.White.copy(alpha = 0.7f), style = MaterialTheme.typography.bodyLarge)
          }
        else ->
          AnimatedContent(
            targetState = state.phase,
            transitionSpec = { fadeIn(tween(240, delayMillis = 90)) togetherWith fadeOut(tween(90)) },
            label = "draft-phase",
          ) { phase ->
            when (phase) {
              DraftMatchStatus.lobby ->
                DraftLobbyScreen(
                  state = state,
                  actions =
                    DraftLobbyActions(
                      onJoin = viewModel::joinMatch,
                      onToggleCaptain = viewModel::toggleCaptain,
                      onRemovePlayer = { viewModel.removePlayer(it.id) },
                      onShuffleCaptains = viewModel::randomizeCaptains,
                      onStartDraft = viewModel::confirmCaptains,
                      onOpenImportPlayers = onImportPlayers,
                      onManualNameChanged = viewModel::onManualNameChanged,
                      onManualPhoneChanged = viewModel::onManualPhoneChanged,
                      onManualEmailChanged = viewModel::onManualEmailChanged,
                      onAddManualPlayer = viewModel::addManualPlayer,
                    ),
                  modifier = Modifier.fillMaxSize(),
                )
              DraftMatchStatus.captainReveal ->
                DraftCaptainRevealScreen(captains = state.captains, onRevealFinished = viewModel::ensureDraftingStarted, modifier = Modifier.fillMaxSize())
              DraftMatchStatus.drafting ->
                DraftBoardScreen(
                  state = state,
                  onPick = viewModel::pickPlayer,
                  onCheckTimerExpiry = viewModel::autoPickIfExpired,
                  modifier = Modifier.fillMaxSize(),
                )
              DraftMatchStatus.complete ->
                DraftTeamRevealScreen(
                  teams = state.teams,
                  actionLabel = if (state.isHost) "Let's Play" else "Watch the match",
                  onAction = { onLetsPlay(state.isHost) },
                  modifier = Modifier.fillMaxSize(),
                )
            }
          }
      }
    }
  }
}
