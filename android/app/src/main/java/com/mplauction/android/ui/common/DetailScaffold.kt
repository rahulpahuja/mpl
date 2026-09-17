package com.mplauction.android.ui.common

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

// Shared chrome for screens pushed onto the back stack outside the tab
// shell (Team detail, the Auction room) — without this they render
// full-bleed with no way back and no status-bar inset handling, the same
// "no top bar" gap HomeScreen's tabs had before it got a TopAppBar.
@Composable
fun DetailScaffold(title: String, onBack: () -> Unit, content: @Composable (Modifier) -> Unit) {
  Scaffold(
    topBar = { GradientTopBar(title = title, onBack = onBack) },
  ) { innerPadding -> content(Modifier.padding(innerPadding)) }
}
