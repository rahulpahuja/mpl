// Synthesized sound effects for the Six or Out mini-game — impact tones,
// crowd roars, and an ambient crowd murmur, all generated with the Web
// Audio API rather than shipped as files, same approach as lib/sound.ts.
// Shares that module's mute preference and unlock timing rather than
// keeping a separate one, so muting from anywhere in the app is consistent.
import { isSoundEnabled } from './sound'

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gainPeak: number) {
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  const g = c.createGain()
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gainPeak, start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.001, start + dur)
  osc.connect(g).connect(c.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

function noiseBurst(c: AudioContext, start: number, dur: number, gainPeak: number, freq: number) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, dur)
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(gainPeak, start)
  g.gain.exponentialRampToValueAtTime(0.001, start + dur)
  src.connect(filter).connect(g).connect(c.destination)
  src.start(start)
}

// A swelling, filtered-noise crowd roar layered on top of the impact sound
// itself for fours, sixes, wickets, and outs.
function crowdRoar(c: AudioContext, peakGain: number, duration: number) {
  const now = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, duration)
  const bandpass = c.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 900
  bandpass.Q.value = 0.6
  const lowpass = c.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 2400
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(peakGain, now + duration * 0.18)
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  src.connect(bandpass).connect(lowpass).connect(g).connect(c.destination)
  src.start(now)
}

export type SoundOutcome = 'out' | 'wicket' | 'run6' | 'run4' | 'run' | 'swing' | 'dot'

export function playOutcomeSound(type: SoundOutcome) {
  if (!isSoundEnabled()) return
  const c = getContext()
  if (!c) return
  const now = c.currentTime
  if (type === 'out' || type === 'wicket') {
    noiseBurst(c, now, 0.05, 0.18, 900)
    tone(c, 160, now + 0.04, 0.3, 'sawtooth', 0.12)
    tone(c, 85, now + 0.08, 0.34, 'sine', 0.14)
    crowdRoar(c, 0.28, 1.3)
  } else if (type === 'run6') {
    noiseBurst(c, now, 0.05, 0.2, 2200)
    tone(c, 880, now + 0.02, 0.4, 'sine', 0.14)
    tone(c, 1318, now + 0.1, 0.45, 'sine', 0.1)
    crowdRoar(c, 0.34, 1.5)
  } else if (type === 'run4') {
    noiseBurst(c, now, 0.045, 0.17, 1800)
    tone(c, 660, now + 0.02, 0.28, 'triangle', 0.1)
    crowdRoar(c, 0.22, 1)
  } else if (type === 'run') {
    noiseBurst(c, now, 0.03, 0.12, 1200)
    tone(c, 440, now, 0.12, 'triangle', 0.08)
  } else if (type === 'swing') {
    noiseBurst(c, now, 0.02, 0.06, 2600)
  } else {
    tone(c, 220, now, 0.08, 'sine', 0.05)
  }
}

// A continuous low crowd murmur while a ball is in play.
let ambienceSource: AudioBufferSourceNode | null = null
let ambienceGain: GainNode | null = null

export function startCrowdAmbience() {
  const c = getContext()
  if (!c || !isSoundEnabled() || ambienceSource) return
  const dur = 4
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 500
  filter.Q.value = 0.5
  const g = c.createGain()
  g.gain.setValueAtTime(0, c.currentTime)
  g.gain.linearRampToValueAtTime(0.045, c.currentTime + 1.2)
  src.connect(filter).connect(g).connect(c.destination)
  src.start()
  ambienceSource = src
  ambienceGain = g
}

export function stopCrowdAmbience() {
  if (!ambienceSource) return
  const c = getContext()
  if (c && ambienceGain) {
    ambienceGain.gain.cancelScheduledValues(c.currentTime)
    ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, c.currentTime)
    ambienceGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.4)
  }
  const src = ambienceSource
  ambienceSource = null
  ambienceGain = null
  setTimeout(() => {
    try {
      src.stop()
    } catch {
      // already stopped
    }
  }, 450)
}
