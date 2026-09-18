package com.mplauction.android.ui.match

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.DraftMatch
import com.mplauction.android.data.model.DraftMatchStatus
import com.mplauction.android.data.model.DraftMatchTeam
import com.mplauction.android.data.repository.DraftMatchRepository
import com.mplauction.android.data.repository.MatchRepository
import com.mplauction.android.ui.common.GradientTopBar
import com.mplauction.android.ui.common.PlayerAvatar
import com.mplauction.android.ui.draft.DraftBackgroundBrush
import com.mplauction.android.ui.draft.draftTeamColor
import com.mplauction.android.ui.theme.BrandOrange
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private val OVER_PRESETS = listOf(1L, 2L, 3L, 5L, 10L, 20L)
private const val MAX_OVERS = 50L

data class MatchConfigUiState(
  val loading: Boolean = true,
  val draft: DraftMatch? = null,
  val matchStarted: Boolean = false,
  val creating: Boolean = false,
  val error: String? = null,
)

class MatchConfigViewModel(
  private val matchRepository: MatchRepository,
  draftMatchRepository: DraftMatchRepository,
  matchId: String,
  private val hostUid: String,
) : ViewModel() {
  private val creatingState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  val uiState: StateFlow<MatchConfigUiState> =
    combine(draftMatchRepository.observeMatch(matchId), matchRepository.observeMatch(matchId), creatingState, errorState) { draft, match, creating, error ->
      MatchConfigUiState(loading = false, draft = draft, matchStarted = match != null, creating = creating, error = error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), MatchConfigUiState())

  // Navigation is driven off matchStarted (the match doc appearing), not
  // this call returning — so a host reopening an already-started match
  // is forwarded the same way, and nothing navigates twice.
  fun start(oversLimit: Long, venueName: String?) {
    val draft = uiState.value.draft ?: return
    if (creatingState.value) return
    creatingState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        matchRepository.createMatchFromDraft(draft, oversLimit, venueName, hostUid)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't start the match"
      } finally {
        creatingState.value = false
      }
    }
  }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MatchConfigScreen(matchId: String, currentUser: AppUser, onBack: () -> Unit, onStarted: () -> Unit, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: MatchConfigViewModel =
    viewModel(key = "match-config-$matchId") { MatchConfigViewModel(container.matchRepository, container.draftMatchRepository, matchId, currentUser.uid) }
  val state by viewModel.uiState.collectAsStateWithLifecycle()

  var navigated by rememberSaveable { mutableStateOf(false) }
  LaunchedEffect(state.matchStarted) {
    if (state.matchStarted && !navigated) {
      navigated = true
      onStarted()
    }
  }

  var overs by rememberSaveable { mutableStateOf<Long?>(5L) }
  var customOvers by rememberSaveable { mutableStateOf("") }
  var addLocation by rememberSaveable { mutableStateOf(false) }
  var venue by rememberSaveable { mutableStateOf("") }
  val oversLimit = overs ?: customOvers.toLongOrNull()?.takeIf { it in 1..MAX_OVERS }

  Scaffold(modifier = modifier, containerColor = Color(0xFF0B0F1A), topBar = { GradientTopBar(title = "Match Setup", onBack = onBack) }) { innerPadding ->
    Box(Modifier.fillMaxSize().padding(innerPadding).background(DraftBackgroundBrush)) {
      val draft = state.draft
      when {
        state.loading -> CircularProgressIndicator(color = Color.White, modifier = Modifier.align(Alignment.Center))
        draft == null || draft.status != DraftMatchStatus.complete || draft.teams.size != 2 ->
          Text("The teams aren't ready yet.", color = MatchTextDim, modifier = Modifier.align(Alignment.Center))
        else ->
          Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Teams Ready!", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            draft.teams.forEachIndexed { index, team -> TeamSummary(draft, team, index) }

            MatchCard {
              SectionLabel("MATCH FORMAT")
              FlowRow(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OVER_PRESETS.forEach { n -> FilterChip(selected = overs == n, onClick = { overs = n }, label = { Text("$n over${if (n == 1L) "" else "s"}") }) }
                FilterChip(selected = overs == null, onClick = { overs = null }, label = { Text("Custom") })
              }
              if (overs == null) {
                OutlinedTextField(
                  value = customOvers,
                  onValueChange = { v -> customOvers = v.filter(Char::isDigit).take(2) },
                  label = { Text("Overs (1–$MAX_OVERS)") },
                  singleLine = true,
                  keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                  modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
              }
              oversLimit?.let { Text("$it Over Match", color = BrandOrange, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp)) }
            }

            MatchCard {
              SectionLabel("LOCATION (OPTIONAL)")
              if (addLocation) {
                OutlinedTextField(
                  value = venue,
                  onValueChange = { venue = it },
                  label = { Text("Ground or venue") },
                  singleLine = true,
                  modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
                TextButton(onClick = { addLocation = false; venue = "" }) { Text("Skip location") }
              } else {
                TextButton(onClick = { addLocation = true }) { Text("📍 Add location") }
              }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
              Text("Status: ", color = MatchTextDim)
              Text("Ready", color = Color.White, fontWeight = FontWeight.Bold)
            }
            state.error?.let { Text(it, color = WicketRed, style = MaterialTheme.typography.bodySmall) }
            Button(
              onClick = { oversLimit?.let { viewModel.start(it, venue.trim().ifBlank { null }) } },
              enabled = oversLimit != null && !state.creating,
              modifier = Modifier.fillMaxWidth().height(56.dp),
            ) {
              Text(if (state.creating) "Starting…" else "LET'S PLAY", fontWeight = FontWeight.Black)
            }
          }
      }
    }
  }
}

@Composable
private fun TeamSummary(draft: DraftMatch, team: DraftMatchTeam, index: Int) {
  val captain = draft.players.find { it.playerId == team.captainId }
  MatchCard {
    Text(team.name, color = draftTeamColor(index), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
      PlayerAvatar(photoURL = captain?.photoURL, avatarId = captain?.avatarId, name = captain?.name.orEmpty(), size = 32.dp)
      Text("  Captain ${captain?.name.orEmpty()} · ${team.playerIds.size} players", color = Color.White)
    }
    Text(
      team.playerIds.mapNotNull { id -> draft.players.find { it.playerId == id }?.name }.joinToString(", "),
      color = MatchTextDim,
      style = MaterialTheme.typography.bodySmall,
      modifier = Modifier.padding(top = 6.dp),
    )
  }
}
