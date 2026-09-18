package com.mplauction.android.ui.match

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.MatchRules
import com.mplauction.android.data.MatchStatFormat
import com.mplauction.android.data.model.InningsState

@Composable
fun ScorecardTab(state: MatchUiState, modifier: Modifier = Modifier) {
  val match = state.match ?: return
  val available = listOfNotNull(match.innings1, match.innings2)
  var selected by remember { mutableStateOf(match.currentInnings) }
  Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
    if (available.isEmpty()) {
      Text("Play hasn't started yet.", color = MatchTextDim)
      return@Column
    }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      available.forEach { innings ->
        FilterChip(
          selected = selected == innings.inningsNumber,
          onClick = { selected = innings.inningsNumber },
          label = { Text(state.side(innings.battingTeamId)?.label().orEmpty()) },
        )
      }
    }
    (available.find { it.inningsNumber == selected } ?: available.last()).let { InningsScorecard(state, it) }
  }
}

@Composable
private fun RowScope.Cell(text: String, weight: Float, bold: Boolean = false, color: Color = Color.White, align: TextAlign = TextAlign.End) {
  Text(
    text,
    color = color,
    fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
    textAlign = align,
    maxLines = 1,
    overflow = TextOverflow.Ellipsis,
    style = MaterialTheme.typography.bodySmall,
    modifier = Modifier.weight(weight),
  )
}

@Composable
private fun InningsScorecard(state: MatchUiState, innings: InningsState) {
  val batsmen = innings.battingStats.values.sortedBy { it.battingOrder }
  val extras = innings.extras
  MatchCard {
    Text(
      "${state.side(innings.battingTeamId)?.label()} — ${innings.scoreLine()} (${MatchRules.formatOvers(innings.legalBallsBowled)} ov)",
      color = Color.White,
      style = MaterialTheme.typography.titleSmall,
      fontWeight = FontWeight.Bold,
    )
    Row(Modifier.fillMaxWidth().padding(top = 10.dp)) {
      Cell("Batsman", 3.2f, color = MatchTextDim, align = TextAlign.Start)
      listOf("R", "B", "4s", "6s", "SR").forEach { Cell(it, if (it == "SR") 1.3f else 0.8f, color = MatchTextDim) }
    }
    batsmen.forEach { b ->
      Column(Modifier.padding(top = 8.dp)) {
        Row {
          Cell(b.name, 3.2f, bold = true, align = TextAlign.Start)
          Cell("${b.runs}", 0.8f, bold = true)
          Cell("${b.balls}", 0.8f)
          Cell("${b.fours}", 0.8f)
          Cell("${b.sixes}", 0.8f)
          Cell(MatchStatFormat.strikeRate(b.runs, b.balls).fmt(), 1.3f)
        }
        Text(MatchStatFormat.formatDismissal(b), color = MatchTextDim, style = MaterialTheme.typography.labelSmall)
      }
    }
    if (batsmen.isEmpty()) Text("No batting yet.", color = MatchTextDim, modifier = Modifier.padding(top = 8.dp))
    val extrasTotal = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalty
    Text(
      "Extras: $extrasTotal (wd ${extras.wides}, nb ${extras.noBalls}, b ${extras.byes}, lb ${extras.legByes}${if (extras.penalty > 0) ", pen ${extras.penalty}" else ""})",
      color = MatchTextDim,
      style = MaterialTheme.typography.bodySmall,
      modifier = Modifier.padding(top = 12.dp),
    )
    Text("Total: ${innings.scoreLine()} in ${MatchRules.formatOvers(innings.legalBallsBowled)} overs", color = Color.White, fontWeight = FontWeight.Bold)
    if (innings.fallOfWickets.isNotEmpty()) {
      Text(
        "Fall of wickets: " + innings.fallOfWickets.joinToString(", ") { "${it.wicket}-${it.runs} (${it.playerName}, ${it.overSummary})" },
        color = MatchTextDim,
        style = MaterialTheme.typography.bodySmall,
        modifier = Modifier.padding(top = 6.dp),
      )
    }
  }
  MatchCard {
    Text("${state.side(innings.bowlingTeamId)?.label()} bowling", color = Color.White, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
    Row(Modifier.fillMaxWidth().padding(top = 10.dp)) {
      Cell("Bowler", 3.2f, color = MatchTextDim, align = TextAlign.Start)
      listOf("O", "M", "R", "W", "WD", "NB", "Econ").forEach { Cell(it, if (it == "Econ") 1.3f else 0.8f, color = MatchTextDim) }
    }
    innings.bowlingStats.values.forEach { b ->
      Row(Modifier.padding(top = 8.dp)) {
        Cell(b.name, 3.2f, bold = true, align = TextAlign.Start)
        Cell(MatchRules.formatOvers(b.legalBalls), 0.8f)
        Cell("${b.maidens}", 0.8f)
        Cell("${b.runsConceded}", 0.8f)
        Cell("${b.wickets}", 0.8f, bold = true)
        Cell("${b.wides}", 0.8f)
        Cell("${b.noBalls}", 0.8f)
        Cell(MatchStatFormat.economyRate(b.runsConceded, b.legalBalls).fmt(), 1.3f)
      }
    }
    if (innings.bowlingStats.isEmpty()) Text("No bowling yet.", color = MatchTextDim, modifier = Modifier.padding(top = 8.dp))
  }
}
