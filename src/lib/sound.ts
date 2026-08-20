// Lightweight synthesized sound effects for auction moments — a hammer
// strike + crowd cheer on "sold", and a soft blip on each new bid. Everything
// is generated with the Web Audio API (oscillators + filtered noise) rather
// than shipped as audio files, so there's zero extra network weight on a
// mobile connection at the auction venue.
//
// Mobile browsers (iOS Safari in particular) refuse to start audio until a
// real user gesture happens in the tab, so the AudioContext is created lazily
// and `unlockAudio` (wired up once from Layout) resumes it on the first
// pointer/key interaction anywhere in the app.

let ctx: AudioContext | null = null
let unlocked = false

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

export function unlockAudio() {
  if (unlocked) return
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  unlocked = true
}

export function isSoundEnabled() {
  return localStorage.getItem('mpl-sound-muted') !== 'true'
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem('mpl-sound-muted', enabled ? 'false' : 'true')
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

// A single gavel knock: a low thump (body of the block) layered with a
// short filtered-noise crack (the transient of wood hitting wood).
function hammerKnock(c: AudioContext, at: number, gain: number) {
  const thump = c.createOscillator()
  thump.type = 'triangle'
  thump.frequency.setValueAtTime(150, at)
  thump.frequency.exponentialRampToValueAtTime(60, at + 0.09)
  const thumpGain = c.createGain()
  thumpGain.gain.setValueAtTime(gain, at)
  thumpGain.gain.exponentialRampToValueAtTime(0.001, at + 0.14)
  thump.connect(thumpGain).connect(c.destination)
  thump.start(at)
  thump.stop(at + 0.15)

  const crack = c.createBufferSource()
  crack.buffer = noiseBuffer(c, 0.05)
  const crackFilter = c.createBiquadFilter()
  crackFilter.type = 'bandpass'
  crackFilter.frequency.value = 2200
  crackFilter.Q.value = 0.9
  const crackGain = c.createGain()
  crackGain.gain.setValueAtTime(gain * 0.9, at)
  crackGain.gain.exponentialRampToValueAtTime(0.001, at + 0.05)
  crack.connect(crackFilter).connect(crackGain).connect(c.destination)
  crack.start(at)
}

// A bright two-note bell to punctuate the "SOLD" reveal.
function stinger(c: AudioContext, at: number) {
  ;[880, 1318.5].forEach((freq, i) => {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const g = c.createGain()
    const start = at + i * 0.09
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(0.16, start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.55)
    osc.connect(g).connect(c.destination)
    osc.start(start)
    osc.stop(start + 0.6)
  })
}

// A short stadium-roar swell built from filtered noise plus a few
// randomly-detuned "whoop" blips for texture.
function crowdCheer(c: AudioContext, at: number) {
  const roar = c.createBufferSource()
  roar.buffer = noiseBuffer(c, 1.6)
  const bandpass = c.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 1000
  bandpass.Q.value = 0.6
  const lowpass = c.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 2600
  const roarGain = c.createGain()
  roarGain.gain.setValueAtTime(0.0001, at)
  roarGain.gain.exponentialRampToValueAtTime(0.22, at + 0.25)
  roarGain.gain.exponentialRampToValueAtTime(0.0001, at + 1.6)
  roar.connect(bandpass).connect(lowpass).connect(roarGain).connect(c.destination)
  roar.start(at)

  for (let i = 0; i < 4; i++) {
    const whoop = c.createOscillator()
    whoop.type = 'sawtooth'
    const start = at + 0.1 + Math.random() * 0.5
    const base = 300 + Math.random() * 200
    whoop.frequency.setValueAtTime(base, start)
    whoop.frequency.linearRampToValueAtTime(base + 120, start + 0.3)
    const whoopFilter = c.createBiquadFilter()
    whoopFilter.type = 'lowpass'
    whoopFilter.frequency.value = 900
    const whoopGain = c.createGain()
    whoopGain.gain.setValueAtTime(0, start)
    whoopGain.gain.linearRampToValueAtTime(0.045, start + 0.05)
    whoopGain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
    whoop.connect(whoopFilter).connect(whoopGain).connect(c.destination)
    whoop.start(start)
    whoop.stop(start + 0.45)
  }
}

export function playSoldFanfare() {
  if (!isSoundEnabled()) return
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = c.currentTime
  hammerKnock(c, now, 0.5)
  hammerKnock(c, now + 0.22, 0.65)
  stinger(c, now + 0.32)
  crowdCheer(c, now + 0.3)
}

export function playBidBlip() {
  if (!isSoundEnabled()) return
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') return
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(520, now)
  osc.frequency.exponentialRampToValueAtTime(700, now + 0.06)
  const g = c.createGain()
  g.gain.setValueAtTime(0.08, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.1)
}

// A short bright chime for a four — a single quick, cheerful bell note.
export function playBoundaryFour() {
  if (!isSoundEnabled()) return
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = c.currentTime
  ;[988, 1319].forEach((freq, i) => {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const g = c.createGain()
    const start = now + i * 0.05
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(0.14, start + 0.015)
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.35)
    osc.connect(g).connect(c.destination)
    osc.start(start)
    osc.stop(start + 0.4)
  })
}

// A bigger, two-octave chime plus a bit of crowd texture for a six —
// noticeably richer than the four's single chime.
export function playBoundarySix() {
  if (!isSoundEnabled()) return
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = c.currentTime
  ;[659, 988, 1319, 1568].forEach((freq, i) => {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const g = c.createGain()
    const start = now + i * 0.06
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(0.16, start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
    osc.connect(g).connect(c.destination)
    osc.start(start)
    osc.stop(start + 0.55)
  })
  crowdCheer(c, now + 0.1)
}

// A sharp stump-rattle crack for a wicket — filtered noise transient plus a
// quick descending thud, distinct from the auction hammer's lower thump.
export function playWicketSound() {
  if (!isSoundEnabled()) return
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = c.currentTime

  const crack = c.createBufferSource()
  crack.buffer = noiseBuffer(c, 0.12)
  const crackFilter = c.createBiquadFilter()
  crackFilter.type = 'bandpass'
  crackFilter.frequency.value = 3200
  crackFilter.Q.value = 1.1
  const crackGain = c.createGain()
  crackGain.gain.setValueAtTime(0.5, now)
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  crack.connect(crackFilter).connect(crackGain).connect(c.destination)
  crack.start(now)

  const thud = c.createOscillator()
  thud.type = 'square'
  thud.frequency.setValueAtTime(180, now)
  thud.frequency.exponentialRampToValueAtTime(45, now + 0.2)
  const thudGain = c.createGain()
  thudGain.gain.setValueAtTime(0.35, now)
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  thud.connect(thudGain).connect(c.destination)
  thud.start(now)
  thud.stop(now + 0.26)
}
