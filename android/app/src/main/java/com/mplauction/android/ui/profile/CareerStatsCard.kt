package com.mplauction.android.ui.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.SportsCricket
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.MatchRules
import com.mplauction.android.data.MatchStatFormat
import com.mplauction.android.data.model.PlayerStats
import com.mplauction.android.ui.match.fmt

// Career numbers from completed Baato matches only (see
// PlayerStatsRepository) — averages/rates are derived from the raw counters
// at display time, never stored.
@Composable
fun CareerStatsCard(stats: PlayerStats, modifier: Modifier = Modifier) {
  val bat = stats.batting
  val bowl = stats.bowling
  Card(modifier.fillMaxWidth()) {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Text("Career Stats", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
      StatHeader("${stats.matchesPlayed} match${if (stats.matchesPlayed == 1L) "" else "es"}", Icons.Filled.EmojiEvents)
      StatRow("Wins", "${stats.wins}", "Losses", "${stats.losses}")
      StatRow("Ties", "${stats.ties}", "Win %", if (stats.matchesPlayed > 0) "${stats.wins * 100 / stats.matchesPlayed}%" else "-")

      StatHeader("Batting", Icons.Filled.SportsCricket)
      StatRow("Innings", "${bat.innings}", "Not outs", "${bat.notOuts}")
      StatRow("Ducks", "${bat.ducks}", "Boundaries", "${bat.fours + bat.sixes}")
      StatRow("Runs", "${bat.runs}", "Highest", "${bat.highScore}")
      StatRow("Average", MatchStatFormat.battingAverage(bat.runs, bat.innings, bat.notOuts).fmt(), "Strike rate", MatchStatFormat.strikeRate(bat.runs, bat.balls).fmt())
      StatRow("4s", "${bat.fours}", "6s", "${bat.sixes}")
      StatRow("25s / 50s", "${bat.twentyFives} / ${bat.fifties}", "100s", "${bat.hundreds}")

      StatHeader("Bowling", Icons.Filled.Speed)
      StatRow("Overs", MatchRules.formatOvers(bowl.legalBalls), "Wickets", "${bowl.wickets}")
      StatRow("Runs", "${bowl.runsConceded}", "Economy", MatchStatFormat.economyRate(bowl.runsConceded, bowl.legalBalls).fmt())
      StatRow(
        "Average",
        MatchStatFormat.bowlingAverage(bowl.runsConceded, bowl.wickets).fmt(),
        "Strike rate",
        if (bowl.wickets > 0) (bowl.legalBalls.toDouble() / bowl.wickets).fmt(1) else "-",
      )
      StatRow("Best", if (bowl.innings > 0) "${bowl.bestWickets}/${bowl.bestRuns}" else "-", "Maidens", "${bowl.maidens}")

      StatHeader("Fielding", Icons.Filled.PanTool)
      StatRow("Catches", "${stats.fielding.catches}", "Run-outs", "${stats.fielding.runOuts}")
    }
  }
}

@Composable
private fun StatHeader(text: String, icon: ImageVector) {
  HorizontalDivider(Modifier.padding(top = 10.dp, bottom = 6.dp))
  Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
    Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
    Text(text, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
  }
}

@Composable
private fun StatRow(leftLabel: String, leftValue: String, rightLabel: String, rightValue: String) {
  Row(Modifier.fillMaxWidth()) {
    StatCell(leftLabel, leftValue, Modifier.weight(1f))
    StatCell(rightLabel, rightValue, Modifier.weight(1f))
  }
}

@Composable
private fun StatCell(label: String, value: String, modifier: Modifier) {
  Row(modifier.padding(vertical = 2.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
    Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
  }
}
