package com.mplauction.android.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

// Placeholder for destinations a later slice fills in (bidding room, teams,
// players, venues, tournaments, users, viewer feed, results, settings, match
// scoring). Keeps the nav shell's structure honest about what's built vs.
// what's coming, instead of hiding unfinished sections.
@Composable
fun StubScreen(title: String, note: String = "Coming in a later build.", modifier: Modifier = Modifier) {
  Column(
    modifier = modifier.fillMaxSize().padding(24.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.Center,
  ) {
    Text(title, style = MaterialTheme.typography.titleLarge)
    Text(note, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
  }
}
