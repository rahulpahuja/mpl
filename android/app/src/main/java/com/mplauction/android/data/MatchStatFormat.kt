package com.mplauction.android.data

import com.mplauction.android.data.model.BatsmanInningsStat
import com.mplauction.android.data.model.WicketType

// Port of src/lib/matchFormat.ts — pure display-formatting helpers for
// match/career stats, kept separate from MatchRules (the scoring engine)
// since these never feed back into stored state, only render it. Rates/
// averages are always derived here from raw counters rather than stored, so
// they can't drift out of sync with the underlying totals (see PlayerStats'
// doc comment in Match.kt).
//
// Named MatchStatFormat, not MatchFormat, to avoid colliding with the
// data.model.MatchFormat enum (friendly/tournament).
object MatchStatFormat {
  fun battingAverage(runs: Long, innings: Long, notOuts: Long): Double? {
    val dismissals = innings - notOuts
    if (dismissals <= 0) return null
    return runs.toDouble() / dismissals
  }

  fun strikeRate(runs: Long, balls: Long): Double? {
    if (balls <= 0) return null
    return runs.toDouble() / balls * 100
  }

  fun bowlingAverage(runsConceded: Long, wickets: Long): Double? {
    if (wickets <= 0) return null
    return runsConceded.toDouble() / wickets
  }

  fun economyRate(runsConceded: Long, legalBalls: Long): Double? {
    if (legalBalls <= 0) return null
    return runsConceded.toDouble() / (legalBalls.toDouble() / 6)
  }

  // Standard scorecard notation: "c Sharma b Kumar", "b Kumar", "lbw b Kumar",
  // "st Patel b Kumar", "run out (Patel)", "c & b Kumar", "not out".
  fun formatDismissal(entry: BatsmanInningsStat): String {
    if (!entry.isOut) return "not out"
    val d = entry.dismissal ?: return "out"
    val bowler = d.bowlerName ?: "bowler"
    return when (d.type) {
      WicketType.bowled -> "b $bowler"
      WicketType.lbw -> "lbw b $bowler"
      WicketType.hitWicket -> "hit wicket b $bowler"
      WicketType.stumped -> "st ${d.fielderName ?: "wk"} b $bowler"
      WicketType.caught -> if (d.fielderId != null && d.fielderId == d.bowlerId) "c & b $bowler" else "c ${d.fielderName ?: "fielder"} b $bowler"
      WicketType.runOut -> if (d.fielderName != null) "run out (${d.fielderName})" else "run out"
      WicketType.retired -> "retired hurt"
      else -> "out"
    }
  }
}
