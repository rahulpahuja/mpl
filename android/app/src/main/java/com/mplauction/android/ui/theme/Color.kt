package com.mplauction.android.ui.theme

import androidx.compose.ui.graphics.Color

// Mirrors the web app's blue-700 -> orange-500 brand gradient (see Login.tsx).
val BrandBlue = Color(0xFF1D4ED8)
val BrandBlueDark = Color(0xFF93C5FD)
val BrandOrange = Color(0xFFF97316)
val BrandOrangeDark = Color(0xFFFDBA74)
val BrandMint = Color(0xFF10B981)

// Material3's lightColorScheme()/darkColorScheme() only derive on/container
// roles for the primary/secondary/tertiary key colors you pass automatically
// when you use the *dynamic* (wallpaper-based) scheme — a manually
// constructed scheme like this app's falls back to the M3 baseline's own
// (purple-tinted) container colors for anything left unset. Spelling these
// out explicitly is what makes e.g. the "live" status chip (secondaryContainer)
// actually read as brand-orange instead of baseline lavender.
val BrandBlueContainer = Color(0xFFDBE4FF)
val BrandOnBlueContainer = Color(0xFF001A41)
val BrandOrangeContainer = Color(0xFFFFDCC2)
val BrandOnOrangeContainer = Color(0xFF351400)
val BrandMintContainer = Color(0xFFB7F0D6)
val BrandOnMintContainer = Color(0xFF00210F)
