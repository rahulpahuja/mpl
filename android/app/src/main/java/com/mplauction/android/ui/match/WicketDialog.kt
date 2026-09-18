package com.mplauction.android.ui.match

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.model.ExtraType
import com.mplauction.android.data.model.InningsState
import com.mplauction.android.data.model.WicketType
import com.mplauction.android.ui.draft.DraftPlayer

private enum class Dismissal(val label: String, val type: WicketType, val batDismissal: Boolean) {
  Bowled("Bowled", WicketType.bowled, true),
  Caught("Caught", WicketType.caught, true),
  CaughtAndBowled("Caught & Bowled", WicketType.caught, true),
  Lbw("LBW", WicketType.lbw, true),
  RunOut("Run Out", WicketType.runOut, false),
  Stumped("Stumped", WicketType.stumped, false),
  HitWicket("Hit Wicket", WicketType.hitWicket, false),
  Retired("Retired", WicketType.retired, false),
  Other("Obstructing / Other", WicketType.other, false),
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WicketDialog(
  innings: InningsState,
  extraType: ExtraType?,
  fielders: List<DraftPlayer>,
  onDismiss: () -> Unit,
  onConfirm: (WicketInput) -> Unit,
) {
  // Mirrors MatchRules' validation so the scorer is never offered a
  // dismissal the engine would reject.
  val runOutOnly = innings.isFreeHit || extraType == ExtraType.wide || extraType == ExtraType.noBall
  val offBye = extraType == ExtraType.bye || extraType == ExtraType.legBye
  val options =
    when {
      runOutOnly -> listOf(Dismissal.RunOut)
      offBye -> Dismissal.entries.filterNot { it.batDismissal }
      else -> Dismissal.entries
    }

  var dismissal by remember { mutableStateOf(options.first()) }
  var dismissedId by remember { mutableStateOf(innings.strikerId.orEmpty()) }
  var fielderId by remember { mutableStateOf<String?>(null) }
  var runs by remember { mutableStateOf(0L) }

  val bowlerId = innings.currentBowlerId
  val needsFielder = dismissal == Dismissal.Caught || dismissal == Dismissal.Stumped
  val showsFielder = needsFielder || dismissal == Dismissal.RunOut
  val canConfirm = dismissedId.isNotEmpty() && (!needsFielder || fielderId != null)

  AlertDialog(
    onDismissRequest = onDismiss,
    title = { Text(if (extraType != null) "Wicket (${extraType.name})" else "Wicket") },
    text = {
      Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("How out?", style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
          options.forEach { option ->
            FilterChip(selected = dismissal == option, onClick = { dismissal = option; fielderId = null }, label = { Text(option.label) })
          }
        }

        if (dismissal == Dismissal.RunOut) {
          Text("Which batsman?", style = MaterialTheme.typography.labelLarge)
          FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOfNotNull(innings.strikerId, innings.nonStrikerId).forEach { id ->
              val name = innings.battingStats[id]?.name ?: "Batsman"
              FilterChip(selected = dismissedId == id, onClick = { dismissedId = id }, label = { Text(if (id == innings.strikerId) "$name (striker)" else name) })
            }
          }
          Text("Runs completed", style = MaterialTheme.typography.labelLarge)
          FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            (0L..3L).forEach { n -> FilterChip(selected = runs == n, onClick = { runs = n }, label = { Text("$n") }) }
          }
        }

        if (showsFielder) {
          Text(if (dismissal == Dismissal.Stumped) "Wicketkeeper" else if (needsFielder) "Caught by" else "Fielder (optional)", style = MaterialTheme.typography.labelLarge)
          FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            fielders.forEach { p ->
              FilterChip(selected = fielderId == p.id, onClick = { fielderId = if (fielderId == p.id) null else p.id }, label = { Text(p.name) })
            }
          }
        }
      }
    },
    confirmButton = {
      TextButton(
        enabled = canConfirm,
        onClick = {
          val isRunOut = dismissal == Dismissal.RunOut
          val fielder =
            if (dismissal == Dismissal.CaughtAndBowled) bowlerId?.let { id -> fielders.find { it.id == id } ?: DraftPlayer(id, innings.bowlingStats[id]?.name.orEmpty()) }
            else fielders.find { it.id == fielderId }
          onConfirm(
            WicketInput(
              type = dismissal.type,
              dismissedPlayerId = if (isRunOut) dismissedId else innings.strikerId.orEmpty(),
              fielderId = fielder?.id,
              fielderName = fielder?.name,
              runs = if (isRunOut) runs else 0,
            ),
          )
        },
      ) {
        Text("OUT!")
      }
    },
    dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
  )
}
