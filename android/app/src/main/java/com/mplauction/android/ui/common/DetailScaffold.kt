package com.mplauction.android.ui.common

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

// Shared chrome for screens pushed onto the back stack outside the tab
// shell (Team detail, the Auction room) — without this they render
// full-bleed with no way back and no status-bar inset handling, the same
// "no top bar" gap HomeScreen's tabs had before it got a TopAppBar.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailScaffold(title: String, onBack: () -> Unit, content: @Composable (Modifier) -> Unit) {
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text(title, color = MaterialTheme.colorScheme.onPrimary) },
        navigationIcon = {
          IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = MaterialTheme.colorScheme.onPrimary)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary),
      )
    },
  ) { innerPadding -> content(Modifier.padding(innerPadding)) }
}
