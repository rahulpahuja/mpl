package com.mplauction.android.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

// Every Card/Button/TextField in the app pulls its corner radius from here —
// the M3 baseline (4/12/16dp) is what made every screen read as generic
// "default Material" before this; bumping it is a one-file lever for the
// whole app's shape language instead of hand-tuning each screen's Cards.
private val AppShapes =
  Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp),
  )

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

  MaterialTheme(colorScheme = colorScheme, typography = Typography, shapes = AppShapes, content = content)
}
