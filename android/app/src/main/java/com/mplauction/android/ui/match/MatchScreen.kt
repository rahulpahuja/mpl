package com.mplauction.android.ui.match

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.MatchStatus
import com.mplauction.android.ui.common.GradientTopBar
import com.mplauction.android.ui.draft.DraftBackgroundBrush

private enum class MatchTab(val title: String) { LIVE("LIVE"), SCORECARD("SCORECARD"), BALLS("BALL BY BALL"), TEAMS("TEAMS"), INFO("INFO") }

// One screen for the whole match, like DraftScreen for the draft: the toss
// until it's recorded, then five tabs. Everyone who opens the match sees
// the same live state; only uids in Match.scorerIds get scoring controls.
@Composable
fun MatchScreen(matchId: String, currentUser: AppUser, onExit: () -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: MatchViewModel =
    viewModel(key = "match-$matchId") { MatchViewModel(container.matchRepository, container.draftMatchRepository, matchId, currentUser.uid) }
  val state by viewModel.uiState.collectAsStateWithLifecycle()
  val match = state.match
  var tab by rememberSaveable { mutableStateOf(MatchTab.LIVE) }

  // Seeing status go toss -> live (on any device) plays the match-start
  // sequence; opening a match that's already live doesn't.
  var previousStatus by remember { mutableStateOf<MatchStatus?>(null) }
  var showStart by remember { mutableStateOf(false) }
  LaunchedEffect(match?.status) {
    val status = match?.status ?: return@LaunchedEffect
    if (previousStatus == MatchStatus.toss && status == MatchStatus.live) showStart = true
    previousStatus = status
  }
  val (moment, dismissMoment) = rememberMatchMoments(state)
  // The match blurs behind a celebration and sharpens again as it dismisses.
  val blurRadius by animateDpAsState(if (moment != null) 8.dp else 0.dp, label = "moment-blur")

  Scaffold(
    modifier = modifier,
    containerColor = Color(0xFF0B0F1A),
    topBar = { GradientTopBar(title = match?.name?.ifBlank { null } ?: "Match", onBack = onExit) },
  ) { innerPadding ->
    Box(Modifier.fillMaxSize().padding(innerPadding).background(DraftBackgroundBrush)) {
      Box(Modifier.fillMaxSize().blur(blurRadius)) {
        when {
          state.loading -> CircularProgressIndicator(color = Color.White, modifier = Modifier.align(Alignment.Center))
          match == null ->
            Text(
              "The host hasn't started this match yet.",
              color = MatchTextDim,
              textAlign = TextAlign.Center,
              modifier = Modifier.align(Alignment.Center).padding(24.dp),
            )
          match.status == MatchStatus.setup || match.status == MatchStatus.toss -> TossScreen(state, onCall = viewModel::flipCoin, onDecide = viewModel::toss)
          else ->
            Column(Modifier.fillMaxSize()) {
              PrimaryScrollableTabRow(
                selectedTabIndex = tab.ordinal,
                containerColor = Color.Transparent,
                contentColor = Color.White,
                edgePadding = 12.dp,
              ) {
                MatchTab.entries.forEach { t ->
                  Tab(selected = tab == t, onClick = { tab = t }, text = { Text(t.title, fontWeight = if (tab == t) FontWeight.Bold else FontWeight.Normal) })
                }
              }
              when (tab) {
                MatchTab.LIVE ->
                  LiveTab(
                    state,
                    LiveActions(
                      onScore = viewModel::score,
                      onWicket = viewModel::wicket,
                      onUndo = viewModel::undo,
                      onPickBatsman = viewModel::pickBatsman,
                      onPickBowler = viewModel::pickBowler,
                      onStartSecondInnings = viewModel::startSecondInnings,
                    ),
                  )
                MatchTab.SCORECARD -> ScorecardTab(state)
                MatchTab.BALLS -> BallByBallTab(state)
                MatchTab.TEAMS -> TeamsTab(state)
                MatchTab.INFO -> InfoTab(state)
              }
            }
        }
      }
      MatchMomentOverlay(moment, state, dismissMoment)
      if (showStart) MatchStartingOverlay(state.tossSummary.orEmpty()) { showStart = false }
    }
  }
}
