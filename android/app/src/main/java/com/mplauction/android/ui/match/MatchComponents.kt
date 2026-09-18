package com.mplauction.android.ui.match

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mplauction.android.data.MatchRules
import com.mplauction.android.data.model.ExtraType
import com.mplauction.android.data.model.InningsState
import com.mplauction.android.data.model.MatchTeamSide
import java.util.Locale

val MatchTextDim = Color.White.copy(alpha = 0.6f)
val MatchPanel = Color.White.copy(alpha = 0.06f)
val WicketRed = Color(0xFFEF4444)
val BoundaryGreen = Color(0xFF10B981)

fun Double?.fmt(digits: Int = 2): String = this?.let { String.format(Locale.US, "%.${digits}f", it) } ?: "-"

fun InningsState.scoreLine(): String = "$totalRuns/$wickets"

fun InningsState.oversLine(oversLimit: Long): String = "${MatchRules.formatOvers(legalBallsBowled)} / $oversLimit ov"

fun InningsState.runRate(): Double? = if (legalBallsBowled > 0) totalRuns / (legalBallsBowled / 6.0) else null

// Short label for a delivery chip: W, wd, nb, b, lb, or the runs.
fun ballLabel(runs: Long, extraType: ExtraType?, isWicket: Boolean): String =
  when {
    isWicket -> "W"
    extraType == ExtraType.wide -> if (runs > 1) "${runs}wd" else "wd"
    extraType == ExtraType.noBall -> if (runs > 1) "${runs}nb" else "nb"
    extraType == ExtraType.bye -> "${runs}b"
    extraType == ExtraType.legBye -> "${runs}lb"
    else -> runs.toString()
  }

@Composable
fun BallChip(runs: Long, extraType: ExtraType?, isWicket: Boolean, modifier: Modifier = Modifier) {
  val background =
    when {
      isWicket -> WicketRed
      extraType == null && runs >= 4 -> BoundaryGreen
      extraType != null -> Color(0xFFF59E0B)
      else -> Color.White.copy(alpha = 0.14f)
    }
  Box(modifier.size(32.dp).clip(CircleShape).background(background), contentAlignment = Alignment.Center) {
    Text(ballLabel(runs, extraType, isWicket), color = Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
  }
}

@Composable
fun MatchCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
  Column(modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(MatchPanel).padding(14.dp), content = content)
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
  Text(text, color = MatchTextDim, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = modifier)
}

fun MatchTeamSide.label(): String = teamName.ifBlank { "Team" }
