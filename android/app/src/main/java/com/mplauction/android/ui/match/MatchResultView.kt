package com.mplauction.android.ui.match

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.MatchRules
import com.mplauction.android.data.model.BatsmanInningsStat
import com.mplauction.android.data.model.BowlerInningsStat
import com.mplauction.android.data.model.InningsState
import com.mplauction.android.data.model.Match
import com.mplauction.android.data.model.MatchStatus
import com.mplauction.android.data.model.WicketType
import com.mplauction.android.ui.common.ConfettiBurst
import com.mplauction.android.ui.common.PlayerAvatar
import com.mplauction.android.ui.draft.DraftPlayer
import com.mplauction.android.ui.draft.draftTeamColor
import com.mplauction.android.ui.theme.BrandOrange

private data class Highlights(val topBat: BatsmanInningsStat?, val topBowl: BowlerInningsStat?, val playerOfMatchId: String?, val playerOfMatchName: String?)

// Player of the Match: a simple points model that suits short casual games
// — a run is a point, a wicket 20, a catch or run-out 10.
private fun highlights(match: Match): Highlights {
  val innings = listOfNotNull(match.innings1, match.innings2)
  val batting = innings.flatMap { it.battingStats.values }
  val bowling = innings.flatMap { it.bowlingStats.values }
  val points = mutableMapOf<String, Long>()
  val names = mutableMapOf<String, String>()
  batting.forEach {
    points.merge(it.playerId, it.runs, Long::plus)
    names[it.playerId] = it.name
  }
  bowling.forEach {
    points.merge(it.playerId, it.wickets * 20, Long::plus)
    names[it.playerId] = it.name
  }
  batting.mapNotNull { it.dismissal }.filter { it.type == WicketType.caught || it.type == WicketType.runOut }.forEach { d ->
    d.fielderId?.let { id ->
      points.merge(id, 10, Long::plus)
      d.fielderName?.let { names.putIfAbsent(id, it) }
    }
  }
  val potm = points.maxByOrNull { it.value }?.key
  return Highlights(
    topBat = batting.maxWithOrNull(compareBy<BatsmanInningsStat> { it.runs }.thenByDescending { it.balls }),
    topBowl = bowling.maxWithOrNull(compareBy<BowlerInningsStat> { it.wickets }.thenByDescending { it.runsConceded }),
    playerOfMatchId = potm,
    playerOfMatchName = potm?.let(names::get),
  )
}

@Composable
fun MatchResultView(state: MatchUiState) {
  val match = state.match ?: return
  val won = match.winnerTeamId != null
  val h = highlights(match)
  Box {
    if (match.status == MatchStatus.completed) ConfettiBurst(Modifier.fillMaxWidth().height(420.dp))
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
      MatchCard {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
          Text("MATCH RESULT", color = MatchTextDim, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Black)
          val headline =
            when {
              match.status == MatchStatus.abandoned -> "MATCH ABANDONED"
              won -> "${state.side(match.winnerTeamId)?.label()?.uppercase()} WINS! 🏆"
              else -> "MATCH TIED"
            }
          Text(headline, color = if (won) BrandOrange else Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
          match.result?.takeIf { it.isNotBlank() }?.let { Text(it, color = Color.White, textAlign = TextAlign.Center) }
        }
      }
      MatchCard {
        listOfNotNull(match.innings1, match.innings2).forEach { InningsSummaryRow(state, it) }
      }
      MatchCard {
        SectionLabel("HIGHLIGHTS")
        // Web-scored matches have no draft roster; the scorecard name still gives the avatar's initial.
        fun who(id: String, name: String?) = state.roster[id] ?: DraftPlayer(id, name.orEmpty())
        h.topBat?.let { HighlightRow(who(it.playerId, it.name), "Highest scorer", "${it.name} — ${it.runs} (${it.balls})") }
        h.topBowl?.let { HighlightRow(who(it.playerId, it.name), "Best bowler", "${it.name} — ${it.wickets}/${it.runsConceded} (${MatchRules.formatOvers(it.legalBalls)})") }
        h.playerOfMatchId?.let { id -> HighlightRow(who(id, h.playerOfMatchName), "Player of the Match", "${h.playerOfMatchName.orEmpty()} ⭐") }
      }
    }
  }
}

@Composable
private fun InningsSummaryRow(state: MatchUiState, innings: InningsState) {
  Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
    Text(
      state.side(innings.battingTeamId)?.label().orEmpty(),
      color = draftTeamColor(state.teamIndex(innings.battingTeamId)),
      fontWeight = FontWeight.Bold,
      modifier = Modifier.weight(1f),
    )
    Text("${innings.scoreLine()}  (${MatchRules.formatOvers(innings.legalBallsBowled)} ov)", color = Color.White, fontWeight = FontWeight.Bold)
  }
}

@Composable
private fun HighlightRow(player: DraftPlayer, label: String, value: String) {
  Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
    PlayerAvatar(photoURL = player.photoURL, avatarId = player.avatarId, name = player.name, size = 44.dp)
    Column {
      Text(label, color = MatchTextDim, style = MaterialTheme.typography.labelSmall)
      Text(value, color = Color.White, style = MaterialTheme.typography.bodyLarge)
    }
  }
}
