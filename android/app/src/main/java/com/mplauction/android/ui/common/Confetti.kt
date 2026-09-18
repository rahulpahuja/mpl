package com.mplauction.android.ui.common

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import kotlin.random.Random

private const val CONFETTI_DURATION_MS = 2600
private val CONFETTI_COLORS = listOf(Color(0xFFFACC15), Color(0xFFFB923C), Color(0xFF3B82F6), Color(0xFFF87171), Color(0xFF34D399), Color.White)

private class ConfettiPiece(val x0: Float, val y0: Float, val vx: Float, val vy0: Float, val spin0: Float, val spinSpeed: Float, val color: Color, val size: Float)

// A falling confetti burst for the app's big celebratory moments (a sale,
// teams ready after a draft). Pass `colors` to tint it toward the moment
// (e.g. a team's brand color) on top of the default palette. `key` restarts
// the burst from scratch when it changes — SoldCelebrationOverlay passes its
// `sold` event so back-to-back sales each get a fresh burst even though the
// overlay composable itself never unmounts between them.
@Composable
fun ConfettiBurst(modifier: Modifier = Modifier, colors: List<Color> = emptyList(), pieceCount: Int = 90, key: Any = Unit) {
  val progress = remember(key) { Animatable(0f) }
  LaunchedEffect(key) { progress.animateTo(1f, tween(CONFETTI_DURATION_MS, easing = LinearEasing)) }

  val pieces =
    remember(key) {
      val palette = colors + CONFETTI_COLORS
      List(pieceCount) {
        ConfettiPiece(
          x0 = Random.nextFloat(),
          y0 = -0.05f - Random.nextFloat() * 0.15f,
          vx = (Random.nextFloat() - 0.5f) * 0.5f,
          vy0 = 0.35f + Random.nextFloat() * 0.45f,
          spin0 = Random.nextFloat() * 360f,
          spinSpeed = (Random.nextFloat() - 0.5f) * 720f,
          color = palette.random(),
          size = 6f + Random.nextFloat() * 6f,
        )
      }
    }

  Canvas(modifier) {
    val t = progress.value
    val gravity = 1.4f
    pieces.forEach { piece ->
      val px = (piece.x0 + piece.vx * t) * size.width
      val py = (piece.y0 + piece.vy0 * t + 0.5f * gravity * t * t) * size.height
      val alpha = (1f - t).coerceIn(0f, 1f).let { if (it > 0.3f) 1f else it / 0.3f }
      rotate(piece.spin0 + piece.spinSpeed * t, pivot = Offset(px, py)) {
        drawRect(color = piece.color.copy(alpha = alpha), topLeft = Offset(px - piece.size / 2, py - piece.size / 4), size = Size(piece.size, piece.size / 2))
      }
    }
  }
}
