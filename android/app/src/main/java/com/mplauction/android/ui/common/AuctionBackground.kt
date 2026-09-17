package com.mplauction.android.ui.common

import androidx.compose.foundation.background
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush

// A soft brand-blue wash behind the auction screens (Setup, Bidding Room,
// Viewer Feed, Results) — everywhere else in the app is a plain
// colorScheme.background list, but the auction itself is the app's main
// event, so it gets its own ambient backdrop instead of reading identical to
// the Teams/Players/Venues admin screens around it.
@Composable
fun Modifier.auctionBackground(): Modifier {
  val colors = MaterialTheme.colorScheme
  return background(
    Brush.verticalGradient(listOf(colors.primaryContainer.copy(alpha = 0.4f), colors.background, colors.background)),
  )
}
