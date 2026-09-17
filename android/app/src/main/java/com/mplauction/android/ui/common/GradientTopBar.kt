package com.mplauction.android.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.mplauction.android.ui.theme.BrandBlue
import com.mplauction.android.ui.theme.BrandOrange

// The brand's blue-700 -> orange-500 sweep (see Login.tsx / Color.kt) as the
// header on every screen, instead of a flat MaterialTheme.colorScheme.primary
// bar — this is the one shared chrome piece every screen renders through
// (HomeScreen's tabs, DetailScaffold's pushed screens), so it's the highest-
// leverage place to make the brand actually visible past the login screen.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradientTopBar(title: String, onBack: (() -> Unit)? = null) {
  TopAppBar(
    title = { Text(title, color = Color.White) },
    navigationIcon = {
      onBack?.let {
        IconButton(onClick = it) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White) }
      }
    },
    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
    modifier = Modifier.fillMaxWidth().background(Brush.horizontalGradient(listOf(BrandBlue, BrandOrange))),
  )
}
