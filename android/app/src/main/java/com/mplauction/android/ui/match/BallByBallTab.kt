package com.mplauction.android.ui.match

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.model.BallOutcome
import com.mplauction.android.data.model.ExtraType
import com.mplauction.android.data.model.WicketType

private data class OverGroup(val inningsNumber: Long, val overNumber: Long, val balls: List<BallOutcome>) {
  val runs: Long get() = balls.sumOf { it.runs + it.extraRuns }
}

private fun describe(ball: BallOutcome): String {
  val total = ball.runs + ball.extraRuns
  val what =
    when (ball.extraType) {
      ExtraType.wide -> "wide${if (total > 1) ", $total runs" else ""}"
      ExtraType.noBall -> "no ball${if (ball.runs > 0) " + ${ball.runs} off the bat" else ""}"
      ExtraType.bye -> "$total bye${if (total == 1L) "" else "s"}"
      ExtraType.legBye -> "$total leg bye${if (total == 1L) "" else "s"}"
      ExtraType.penalty -> "$total penalty"
      null ->
        when (ball.runs) {
          0L -> "no run"
          4L -> "FOUR"
          6L -> "SIX"
          else -> "${ball.runs} run${if (ball.runs == 1L) "" else "s"}"
        }
    }
  return if (ball.isWicket) "OUT (${ball.wicketType?.label()}) — $what" else what
}

private fun WicketType.label() =
  when (this) {
    WicketType.runOut -> "run out"
    WicketType.hitWicket -> "hit wicket"
    WicketType.lbw -> "LBW"
    else -> name
  }

@Composable
fun BallByBallTab(state: MatchUiState, modifier: Modifier = Modifier) {
  val overs =
    state.balls
      .groupBy { it.inningsNumber to it.overNumber }
      .map { (key, balls) -> OverGroup(key.first, key.second, balls) }
      .sortedWith(compareByDescending<OverGroup> { it.inningsNumber }.thenByDescending { it.overNumber })
  if (overs.isEmpty()) {
    Text("No deliveries yet.", color = MatchTextDim, modifier = modifier.padding(16.dp))
    return
  }
  LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
    items(overs, key = { "${it.inningsNumber}-${it.overNumber}" }) { over -> OverCard(state, over) }
  }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun OverCard(state: MatchUiState, over: OverGroup) {
  var expanded by remember { mutableStateOf(false) }
  val innings = if (over.inningsNumber == 1L) state.match?.innings1 else state.match?.innings2
  fun name(id: String) = innings?.battingStats?.get(id)?.name ?: innings?.bowlingStats?.get(id)?.name ?: state.player(id).name
  MatchCard(Modifier.clickable { expanded = !expanded }) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text(
        "${if (over.inningsNumber == 2L) "2nd inn · " else ""}Over ${over.overNumber + 1} · ${name(over.balls.first().bowlerId)}",
        color = Color.White,
        fontWeight = FontWeight.Bold,
        style = MaterialTheme.typography.bodyMedium,
        modifier = Modifier.weight(1f),
      )
      Text("${over.runs} run${if (over.runs == 1L) "" else "s"}", color = MatchTextDim, style = MaterialTheme.typography.bodyMedium)
    }
    FlowRow(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
      over.balls.forEach { BallChip(it.runs + it.extraRuns, it.extraType, it.isWicket) }
    }
    if (expanded) {
      over.balls.forEach { ball ->
        Text(
          "${ball.overNumber}.${ball.ballInOver}  ${name(ball.bowlerId)} to ${name(ball.strikerId)}: ${describe(ball)}",
          color = if (ball.isWicket) WicketRed else Color.White,
          style = MaterialTheme.typography.bodySmall,
          modifier = Modifier.padding(top = 6.dp),
        )
      }
    }
  }
}
