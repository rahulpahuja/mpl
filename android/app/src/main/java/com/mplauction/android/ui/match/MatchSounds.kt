package com.mplauction.android.ui.match

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.sin
import kotlin.random.Random
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Port of playOutcomeSound in src/lib/sixOrOutSound.ts (run4 / run6 /
// wicket): an impact noise burst, a tone, and a swelling crowd roar, all
// synthesized rather than shipped as audio files — same approach as the
// web app. Each sound is rendered once to 16-bit PCM and cached, then
// played on media volume via a static AudioTrack.
object MatchSounds {
  private const val RATE = 22_050
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
  private enum class Kind { FOUR, SIX, WICKET }

  private val cache = mutableMapOf<Kind, ShortArray>()

  // A 25 gets the FOUR sound; a 50 or 100 the bigger SIX roar.
  private fun kindFor(moment: MatchMoment): Kind? =
    when (moment) {
      MatchMoment.Four -> Kind.FOUR
      MatchMoment.Six -> Kind.SIX
      MatchMoment.Wicket -> Kind.WICKET
      is MatchMoment.Milestone -> if (moment.runs >= 50) Kind.SIX else Kind.FOUR
      is MatchMoment.OverComplete -> null
    }

  fun play(moment: MatchMoment) {
    val kind = kindFor(moment) ?: return
    scope.launch {
      val pcm = synchronized(cache) { cache.getOrPut(kind) { render(kind) } }
      val track =
        AudioTrack.Builder()
          .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
          .setAudioFormat(AudioFormat.Builder().setSampleRate(RATE).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
          .setBufferSizeInBytes(pcm.size * 2)
          .setTransferMode(AudioTrack.MODE_STATIC)
          .build()
      runCatching {
        track.write(pcm, 0, pcm.size)
        track.play()
        delay(pcm.size * 1000L / RATE + 100)
      }
      track.release()
    }
  }

  private fun render(kind: Kind): ShortArray {
    val out = FloatArray((RATE * 1.6).toInt())
    when (kind) {
      Kind.WICKET -> {
        noiseBurst(out, 0.0, 0.05, 0.18, 900.0)
        tone(out, 160.0, 0.04, 0.3, Wave.SAW, 0.12)
        tone(out, 85.0, 0.08, 0.34, Wave.SINE, 0.14)
        crowdRoar(out, 0.28, 1.3)
      }
      Kind.SIX -> {
        noiseBurst(out, 0.0, 0.05, 0.2, 2200.0)
        tone(out, 880.0, 0.02, 0.4, Wave.SINE, 0.14)
        tone(out, 1318.0, 0.1, 0.45, Wave.SINE, 0.1)
        crowdRoar(out, 0.34, 1.5)
      }
      Kind.FOUR -> {
        noiseBurst(out, 0.0, 0.045, 0.17, 1800.0)
        tone(out, 660.0, 0.02, 0.28, Wave.TRIANGLE, 0.1)
        crowdRoar(out, 0.22, 1.0)
      }
    }
    return ShortArray(out.size) { i -> (out[i].coerceIn(-1f, 1f) * Short.MAX_VALUE).toInt().toShort() }
  }

  private enum class Wave { SINE, TRIANGLE, SAW }

  // Linear 15ms attack, then an exponential fall to 0.001 by start + dur —
  // the same envelope as the web version's gain ramps.
  private fun tone(out: FloatArray, freq: Double, start: Double, dur: Double, wave: Wave, peak: Double) {
    val from = (start * RATE).toInt()
    val attack = 0.015 * RATE
    val length = (dur * RATE).toInt()
    val decayRate = ln(0.001 / peak) / length
    for (n in 0 until length) {
      val i = from + n
      if (i >= out.size) break
      val phase = (freq * n / RATE) % 1.0
      val sample =
        when (wave) {
          Wave.SINE -> sin(2 * PI * phase)
          Wave.TRIANGLE -> 4 * abs(phase - 0.5) - 1
          Wave.SAW -> 2 * phase - 1
        }
      val gain = if (n < attack) peak * n / attack else peak * exp(decayRate * n)
      out[i] += (sample * gain).toFloat()
    }
  }

  private fun noiseBurst(out: FloatArray, start: Double, dur: Double, peak: Double, freq: Double) {
    val filter = Biquad.bandpass(freq, 1.0)
    val from = (start * RATE).toInt()
    val length = (dur * RATE).toInt()
    val decayRate = ln(0.001 / peak) / length
    for (n in 0 until length) {
      val i = from + n
      if (i >= out.size) break
      out[i] += (filter.process(Random.nextDouble(-1.0, 1.0)) * peak * exp(decayRate * n)).toFloat()
    }
  }

  // Filtered noise swelling to its peak at 18% of the duration, then dying
  // away — a crowd roar layered on the impact.
  private fun crowdRoar(out: FloatArray, peak: Double, dur: Double) {
    val bandpass = Biquad.bandpass(900.0, 0.6)
    val lowpass = Biquad.lowpass(2400.0, 0.707)
    val length = (dur * RATE).toInt()
    val rise = (length * 0.18).toInt()
    val floor = 0.0001
    for (n in 0 until minOf(length, out.size)) {
      val gain =
        if (n < rise) floor * exp(ln(peak / floor) * n / rise)
        else peak * exp(ln(floor / peak) * (n - rise) / (length - rise))
      out[n] += (lowpass.process(bandpass.process(Random.nextDouble(-1.0, 1.0))) * gain).toFloat()
    }
  }

  // RBJ audio-EQ-cookbook biquad, the same filters BiquadFilterNode uses.
  private class Biquad(val b0: Double, val b1: Double, val b2: Double, val a1: Double, val a2: Double) {
    private var x1 = 0.0
    private var x2 = 0.0
    private var y1 = 0.0
    private var y2 = 0.0

    fun process(x: Double): Double {
      val y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      x2 = x1
      x1 = x
      y2 = y1
      y1 = y
      return y
    }

    companion object {
      private fun coefficients(freq: Double, q: Double): Triple<Double, Double, Double> {
        val w0 = 2 * PI * freq / RATE
        return Triple(cos(w0), sin(w0) / (2 * q), 1 + sin(w0) / (2 * q))
      }

      fun bandpass(freq: Double, q: Double): Biquad {
        val (cosW, alpha, a0) = coefficients(freq, q)
        return Biquad(alpha / a0, 0.0, -alpha / a0, -2 * cosW / a0, (1 - alpha) / a0)
      }

      fun lowpass(freq: Double, q: Double): Biquad {
        val (cosW, alpha, a0) = coefficients(freq, q)
        return Biquad((1 - cosW) / 2 / a0, (1 - cosW) / a0, (1 - cosW) / 2 / a0, -2 * cosW / a0, (1 - alpha) / a0)
      }
    }
  }
}
