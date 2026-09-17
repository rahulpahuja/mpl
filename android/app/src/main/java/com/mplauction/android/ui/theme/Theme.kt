package com.mplauction.android.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = BrandBlueDark,
    secondary = BrandOrangeDark,
    tertiary = BrandMint,
    secondaryContainer = BrandOnOrangeContainer,
    onSecondaryContainer = BrandOrangeContainer,
    tertiaryContainer = BrandOnMintContainer,
    onTertiaryContainer = BrandMintContainer,
  )

private val LightColorScheme =
  lightColorScheme(
    primary = BrandBlue,
    secondary = BrandOrange,
    tertiary = BrandMint,
    primaryContainer = BrandBlueContainer,
    onPrimaryContainer = BrandOnBlueContainer,
    secondaryContainer = BrandOrangeContainer,
    onSecondaryContainer = BrandOnOrangeContainer,
    tertiaryContainer = BrandMintContainer,
    onTertiaryContainer = BrandOnMintContainer,
  )

@Composable
fun MplAuctionTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  // Off by default: this app has a real brand (see Color.kt) that should
  // look the same as the web app on every device, not get overridden by
  // each phone's wallpaper-derived Material You palette.
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        val context = LocalContext.current
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
      }
      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
