import { useEffect, useRef, useState } from 'react'
import './SixOrOutGame.css'
import { playOutcomeSound, startCrowdAmbience, stopCrowdAmbience, type SoundOutcome } from '../lib/sixOrOutSound'
import { isSoundEnabled, setSoundEnabled } from '../lib/sound'

// A first-person bowler-vs-batsman waiting-room mini-game: bat for runs or
// bowl for wickets, timed against a single tap. See SixOrOutGame.css for
// the "why" behind the visual choices (stadium bowl crowd, forced-
// perspective pitch, stump placement, etc.) — this file is the game loop.

type OutcomeType = 'run' | 'dot' | 'out' | 'wicket'
interface Outcome {
  label: string
  value: number
  type: OutcomeType
}
interface Tier {
  max: number
  bat: Outcome
  bowl: Outcome
}

const COLORS: Record<string, string> = {
  dot: '#93a0ad',
  one: '#22c55e',
  two: '#06b6d4',
  four: '#3b82f6',
  six: '#fbbf24',
  out: '#dc2626',
  wicket: '#8b5cf6',
}

// Tiers are indexed by |timing error in ms| from the ideal contact/release
// moment. Batting rewards precision with a six; bowling rewards the exact
// same precision with a wicket — same skill, opposite payoff, which is why
// one timing model powers both modes instead of two separate mini-games.
const TIERS: Tier[] = [
  { max: 45, bat: { label: 'SIX!', value: 6, type: 'run' }, bowl: { label: 'WICKET!', value: 0, type: 'wicket' } },
  { max: 100, bat: { label: 'FOUR!', value: 4, type: 'run' }, bowl: { label: 'DOT BALL', value: 0, type: 'dot' } },
  { max: 160, bat: { label: '2 RUNS', value: 2, type: 'run' }, bowl: { label: '1 RUN', value: 1, type: 'run' } },
  { max: 230, bat: { label: '1 RUN', value: 1, type: 'run' }, bowl: { label: '2 RUNS', value: 2, type: 'run' } },
  { max: 300, bat: { label: 'DOT BALL', value: 0, type: 'dot' }, bowl: { label: 'FOUR!', value: 4, type: 'run' } },
  { max: Infinity, bat: { label: 'OUT! BOWLED', value: 0, type: 'out' }, bowl: { label: 'SIX!', value: 6, type: 'run' } },
]

const TOTAL_BALLS = 6
const INCOMING_MS = 320
const OUTCOME_MS = 750
const OUTCOME_MS_BIG = 1000
const BASE_DELIVERY = 950
const DELIVERY_STEP = 55
const DELIVERY_FLOOR = 640
const AUTO_MISS_GRACE = 320

// First-person layout: the ball travels straight down the pitch centerline
// (CENTER_X) where both sets of stumps live. The batsman realistically
// stands right at their stumps (BATSMAN_X, close to center) with just a
// sliver of stump peeking on either side; the bowler approaches from an
// angled run-up off to the side (BOWLER_X), keeping their own end's stumps
// visible. The opponent stands small near the horizon (FAR_Y); "you" stand
// big in the foreground (NEAR_Y) — which figure is which swaps with mode,
// but each keeps its own X regardless of near/far.
const CENTER_X = 50
const BATSMAN_X = 46
const BOWLER_X = 27
const FAR_Y = 36
const NEAR_Y = 90
const FAR_SCALE = 0.5
const NEAR_SCALE = 1.3
const CONTACT_Y = NEAR_Y - 12
const CONTACT_SCALE = 1.15
const RELEASE_Y = FAR_Y + 2
const RELEASE_SCALE = 0.35

type Mode = 'bat' | 'bowl'
type ViewName = 'menu' | 'play' | 'end'
type Phase = 'menu' | 'incoming' | 'active' | 'outcome' | 'end'
type Pos = { x: number; y: number; s: number }

function setPos(el: HTMLElement | null, xPct: number, yPct: number, scale?: number) {
  if (!el) return
  el.style.left = xPct + '%'
  el.style.top = yPct + '%'
  if (scale !== undefined) el.style.setProperty('--s', String(scale))
}

// Generic position (+ optional scale) tween. arc is an optional upward bump
// (negative = higher) for paths that still want a little hop.
function tween(
  el: HTMLElement | null,
  from: { x: number; y: number },
  to: { x: number; y: number },
  duration: number,
  arc: number,
  onDone: (() => void) | null,
  scaleFrom?: number,
  scaleTo?: number,
) {
  if (!el) return () => {}
  const start = performance.now()
  let raf = 0
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration)
    const ease = p < 1 ? 1 - Math.pow(1 - p, 2) : 1
    const x = from.x + (to.x - from.x) * ease
    const y = from.y + (to.y - from.y) * ease - arc * 4 * p * (1 - p)
    const scale = scaleFrom === undefined ? undefined : scaleFrom + ((scaleTo ?? scaleFrom) - scaleFrom) * ease
    setPos(el, x, y, scale)
    if (p < 1) raf = requestAnimationFrame(step)
    else if (onDone) onDone()
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

export function SixOrOutGame({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<ViewName>('menu')
  const [mode, setMode] = useState<Mode>('bat')
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  const [night, setNight] = useState(false)
  const [hudLeftLabel, setHudLeftLabel] = useState('Score')
  const [hudLeftValue, setHudLeftValue] = useState(0)
  const [hudRightValue, setHudRightValue] = useState(0)
  const [ballIndex, setBallIndexState] = useState(0)
  const [statusText, setStatusText] = useState('Get ready…')
  const [tapHintVisible, setTapHintVisible] = useState(false)
  const [tapHintText, setTapHintText] = useState('TAP TO SWING')
  const [shake, setShake] = useState(false)
  const [result, setResult] = useState({ title: '', score: '', verdict: '' })

  const fieldRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLDivElement>(null)
  const bowlerFigRef = useRef<HTMLDivElement>(null)
  const batsmanFigRef = useRef<HTMLDivElement>(null)
  const batRef = useRef<SVGGElement>(null)
  const bowlArmRef = useRef<SVGGElement>(null)
  const handBallRef = useRef<SVGCircleElement>(null)
  const bail1Ref = useRef<HTMLDivElement>(null)
  const bail2Ref = useRef<HTMLDivElement>(null)
  const bail1NearRef = useRef<HTMLDivElement>(null)
  const bail2NearRef = useRef<HTMLDivElement>(null)
  const outcomeBannerRef = useRef<HTMLDivElement>(null)
  const confettiRef = useRef<HTMLCanvasElement>(null)

  // Mutable game state that changes many times a second (tween frames) or
  // needs to be read from timeouts — kept out of React state on purpose so
  // none of it triggers a re-render.
  const g = useRef({
    mode: 'bat' as Mode,
    ballIndex: 0,
    score: 0,
    wickets: 0,
    phase: 'menu' as Phase,
    deliveryMs: BASE_DELIVERY,
    startTime: 0,
    ballTweenCancel: null as (() => void) | null,
    timers: [] as ReturnType<typeof setTimeout>[],
    confettiRaf: 0,
  }).current

  function clearTimers() {
    g.timers.forEach(clearTimeout)
    g.timers = []
  }
  function after(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms)
    g.timers.push(id)
    return id
  }

  function positionFigure(el: HTMLElement | null, isNear: boolean, x: number) {
    setPos(el, x, isNear ? NEAR_Y : FAR_Y)
    el?.style.setProperty('--fig-scale', String(isNear ? NEAR_SCALE : FAR_SCALE))
  }

  function resetStumps() {
    ;[bail1Ref.current, bail2Ref.current, bail1NearRef.current, bail2NearRef.current].forEach((el) => {
      if (!el) return
      // Clear the inline transition flyBails() sets, or this "reset" would
      // itself animate the bails sliding back into place before the next ball.
      el.style.transition = 'none'
      el.style.transform = ''
      el.style.opacity = '1'
    })
  }

  function showBanner(text: string, color: string) {
    const el = outcomeBannerRef.current
    if (!el) return
    el.textContent = text
    el.style.color = color
    el.classList.remove('pop')
    void el.offsetWidth
    el.classList.add('pop')
  }

  function flyBails(bail1: HTMLElement | null, bail2: HTMLElement | null, dx1: number, dy1: number, dx2: number, dy2: number) {
    if (!bail1 || !bail2) return
    bail1.style.transition = 'transform 260ms ease-out, opacity 400ms ease-out 200ms'
    bail2.style.transition = 'transform 260ms ease-out, opacity 400ms ease-out 200ms'
    bail1.style.transform = `translate(${dx1}px, ${dy1}px) rotate(-40deg)`
    bail2.style.transform = `translate(${dx2}px, ${dy2}px) rotate(35deg)`
  }

  function bowled() {
    // Bowling mode: the wicket is at the far end (the batsman you're
    // bowling to) — those are the visible, correct stumps to break.
    // Batting mode: it's your own near-end stumps that get hit.
    if (g.mode === 'bowl') flyBails(bail1Ref.current, bail2Ref.current, -4, -7, 5, -6)
    else flyBails(bail1NearRef.current, bail2NearRef.current, -9, -15, 11, -13)
    setShake(false)
    requestAnimationFrame(() => setShake(true))
  }

  function currentBallPos(): Pos {
    const ball = ballRef.current
    const field = fieldRef.current
    if (!ball || !field) return { x: CENTER_X, y: CONTACT_Y, s: 1 }
    const rect = ball.getBoundingClientRect()
    const fieldRect = field.getBoundingClientRect()
    let s = parseFloat(getComputedStyle(ball).getPropertyValue('--s'))
    if (Number.isNaN(s)) s = 1
    return {
      x: ((rect.left + rect.width / 2 - fieldRect.left) / fieldRect.width) * 100,
      y: ((rect.top + rect.height / 2 - fieldRect.top) / fieldRect.height) * 100,
      s,
    }
  }

  function playSoundOutcome(type: SoundOutcome) {
    playOutcomeSound(type)
  }

  function tierFor(absErr: number): Tier {
    for (const tier of TIERS) if (absErr <= tier.max) return tier
    return TIERS[TIERS.length - 1]
  }

  function bumpHud(outcome: Outcome) {
    if (outcome.type === 'wicket' || outcome.type === 'out') g.wickets += 1
    else g.score += outcome.value
    setHudLeftValue(g.score)
    setHudRightValue(g.wickets)
  }

  function resolveBatting(outcome: Outcome) {
    // A tap mid-flight interrupts the delivery tween still running toward
    // the bat — cancel it so it can't fight the post-hit tween over the ball.
    if (g.ballTweenCancel) {
      g.ballTweenCancel()
      g.ballTweenCancel = null
    }
    const bat = batRef.current
    if (bat) {
      bat.classList.remove('swing')
      void bat.getBoundingClientRect()
      bat.classList.add('swing')
    }
    const color =
      outcome.type === 'out'
        ? COLORS.out
        : COLORS[outcome.value === 6 ? 'six' : outcome.value === 4 ? 'four' : outcome.value === 2 ? 'two' : outcome.value === 1 ? 'one' : 'dot']
    const soundKey: SoundOutcome =
      outcome.type === 'out' ? 'out' : outcome.value === 6 ? 'run6' : outcome.value === 4 ? 'run4' : outcome.value > 0 ? 'run' : 'swing'
    const cur = currentBallPos()

    // The ball came from the far horizon and is close/big at contact — hit
    // outcomes send it flying away (shrinking); a missed/late shot just
    // carries on past you toward your own end.
    if (outcome.type === 'out') {
      tween(ballRef.current, cur, { x: CENTER_X, y: 98 }, 140, 0, bowled, cur.s, CONTACT_SCALE * 1.1)
    } else if (outcome.value === 6) {
      tween(ballRef.current, cur, { x: 63, y: 4 }, 640, 0, burstConfetti, cur.s, 0.12)
    } else if (outcome.value === 4) {
      tween(ballRef.current, cur, { x: 86, y: 55 }, 520, 0, null, cur.s, 0.32)
    } else if (outcome.value === 2) {
      tween(ballRef.current, cur, { x: 26, y: 60 }, 420, -10, null, cur.s, 0.52)
    } else if (outcome.value === 1) {
      tween(ballRef.current, cur, { x: 62, y: 72 }, 340, -8, null, cur.s, 0.82)
    } else {
      tween(ballRef.current, cur, { x: 56, y: 82 }, 200, 0, null, cur.s, CONTACT_SCALE)
    }

    playSoundOutcome(soundKey)
    showBanner(outcome.label, color)
    bumpHud(outcome)
    finishBall(outcome.value === 6 || outcome.type === 'out')
  }

  function resolveBowling(outcome: Outcome) {
    const color =
      outcome.type === 'wicket'
        ? COLORS.wicket
        : COLORS[outcome.value === 6 ? 'six' : outcome.value === 4 ? 'four' : outcome.value === 2 ? 'two' : outcome.value === 1 ? 'one' : 'dot']
    const soundKey: SoundOutcome =
      outcome.type === 'wicket' ? 'wicket' : outcome.value === 6 ? 'run6' : outcome.value === 4 ? 'run4' : outcome.value > 0 ? 'run' : 'swing'
    const big = outcome.type === 'wicket' || outcome.value === 6

    // The tap is the release, not the result — the batsman still has to
    // face the ball, so the banner/sound/score wait for it to arrive rather
    // than firing the instant you bowl.
    ballRef.current?.classList.remove('hidden')
    setPos(ballRef.current, CENTER_X, CONTACT_Y, CONTACT_SCALE)
    bowlArmRef.current?.classList.add('swing')
    handBallRef.current?.classList.add('released')
    tween(
      ballRef.current,
      { x: CENTER_X, y: CONTACT_Y },
      { x: CENTER_X, y: RELEASE_Y },
      420,
      0,
      () => {
        const bat = batRef.current
        if (bat) {
          bat.classList.remove('swing')
          void bat.getBoundingClientRect()
          bat.classList.add('swing')
        }
        playSoundOutcome(soundKey)
        showBanner(outcome.label, color)
        bumpHud(outcome)
        finishBall(big)

        if (outcome.type === 'wicket') {
          bowled()
          return
        }
        const cur = currentBallPos()
        if (outcome.value === 6) tween(ballRef.current, cur, { x: 36, y: 6 }, 560, 0, burstConfetti, cur.s, 0.1)
        else if (outcome.value === 4) tween(ballRef.current, cur, { x: 14, y: 45 }, 480, 0, null, cur.s, 0.2)
        else if (outcome.value === 2) tween(ballRef.current, cur, { x: 66, y: 50 }, 400, 0, null, cur.s, 0.26)
        else if (outcome.value === 1) tween(ballRef.current, cur, { x: 40, y: 48 }, 340, 0, null, cur.s, 0.3)
      },
      CONTACT_SCALE,
      RELEASE_SCALE,
    )
  }

  function resolve(elapsedMs: number) {
    if (g.phase !== 'active') return
    g.phase = 'outcome'
    const error = elapsedMs - g.deliveryMs
    const tier = tierFor(Math.abs(error))
    const outcome = g.mode === 'bat' ? tier.bat : tier.bowl
    if (g.mode === 'bat') resolveBatting(outcome)
    else resolveBowling(outcome)
  }

  function beginBatterDelivery() {
    g.phase = 'active'
    g.startTime = performance.now()
    ballRef.current?.classList.remove('hidden')
    setPos(ballRef.current, CENTER_X, RELEASE_Y, RELEASE_SCALE)
    setStatusText('Time your shot!')
    setTapHintText('TAP TO SWING')
    setTapHintVisible(true)
    bowlArmRef.current?.classList.add('swing')
    handBallRef.current?.classList.add('released')

    g.ballTweenCancel = tween(
      ballRef.current,
      { x: CENTER_X, y: RELEASE_Y },
      { x: CENTER_X, y: CONTACT_Y },
      g.deliveryMs,
      0,
      () => {
        g.ballTweenCancel = null
        // Ball reached the bat with no swing yet — give a short grace
        // window, then it's bowled.
        after(() => {
          if (g.phase === 'active') resolve(performance.now() - g.startTime)
        }, AUTO_MISS_GRACE)
      },
      RELEASE_SCALE,
      CONTACT_SCALE,
    )
  }

  // No visible run-up in first person (you can't see yourself run) — the
  // ball in your hand pulses bigger as the release window approaches, and
  // that pulse duration is the timing tell instead.
  function beginBowlerRunup() {
    g.phase = 'active'
    g.startTime = performance.now()
    setStatusText('Tap to release!')
    setTapHintText('TAP TO BOWL')
    setTapHintVisible(true)
    const hb = handBallRef.current
    if (hb) {
      hb.style.animationDuration = g.deliveryMs + 'ms'
      hb.classList.add('charging')
    }
    after(() => {
      if (g.phase === 'active') resolve(performance.now() - g.startTime)
    }, g.deliveryMs + AUTO_MISS_GRACE)
  }

  function finishBall(big: boolean) {
    setTapHintVisible(false)
    setStatusText('')
    const wait = big ? OUTCOME_MS_BIG : OUTCOME_MS
    after(() => {
      g.ballIndex += 1
      setBallIndexState(g.ballIndex)
      const overOut = g.mode === 'bat' && g.wickets > 0
      const oversDone = g.ballIndex >= TOTAL_BALLS
      if (overOut || oversDone) endInnings(overOut)
      else nextBall()
    }, wait)
  }

  function nextBall() {
    clearTimers()
    resetStumps()
    g.phase = 'incoming'
    g.deliveryMs = Math.max(DELIVERY_FLOOR, BASE_DELIVERY - g.ballIndex * DELIVERY_STEP)
    ballRef.current?.classList.add('hidden')
    batRef.current?.classList.remove('swing')
    bowlArmRef.current?.classList.remove('swing')
    handBallRef.current?.classList.remove('released', 'charging')
    if (handBallRef.current) {
      handBallRef.current.style.animation = ''
      handBallRef.current.style.opacity = '1'
    }
    // The figure standing in for "you" is big and near; the opponent is
    // small and far. Each figure keeps its own realistic X regardless of
    // that (batsman at the stumps, bowler off to the side).
    if (g.mode === 'bat') {
      positionFigure(batsmanFigRef.current, true, BATSMAN_X)
      positionFigure(bowlerFigRef.current, false, BOWLER_X)
    } else {
      positionFigure(bowlerFigRef.current, true, BOWLER_X)
      positionFigure(batsmanFigRef.current, false, BATSMAN_X)
    }
    setTapHintVisible(false)
    setStatusText(g.mode === 'bat' ? 'Bowler running in…' : 'Charge up your release…')

    after(() => {
      if (g.mode === 'bat') beginBatterDelivery()
      else beginBowlerRunup()
    }, INCOMING_MS)
  }

  function endInnings(gotOut: boolean) {
    stopCrowdAmbience()
    g.phase = 'end'
    let title: string
    let score: string
    let verdict: string
    if (g.mode === 'bat') {
      title = gotOut ? 'Innings complete — out' : 'Innings complete — not out'
      score = g.score + (gotOut ? '' : '*') + ' off ' + g.ballIndex
      verdict = g.score >= 24 ? 'Blistering innings!' : g.score >= 12 ? 'Solid knock.' : 'Tough pitch out there.'
    } else {
      title = 'Over complete'
      score = g.wickets + '/' + g.score
      verdict = g.wickets >= 2 ? 'Excellent over!' : g.score <= 6 ? 'Tidy over.' : 'Expensive over.'
    }
    setResult({ title, score, verdict })
    setView('end')
  }

  function startInnings(nextMode: Mode) {
    g.mode = nextMode
    g.ballIndex = 0
    g.score = 0
    g.wickets = 0
    setMode(nextMode)
    setHudLeftLabel(nextMode === 'bat' ? 'Score' : 'Conceded')
    setHudLeftValue(0)
    setHudRightValue(0)
    setBallIndexState(0)
    setView('play')
  }

  // The play view's DOM (and refs) only exist once `view === 'play'` has
  // actually rendered — kick the first ball off from an effect rather than
  // synchronously in startInnings, so every ref is populated by then.
  useEffect(() => {
    if (view !== 'play') return
    startCrowdAmbience()
    nextBall()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  useEffect(() => {
    return () => {
      stopCrowdAmbience()
      clearTimers()
      cancelAnimationFrame(g.confettiRaf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTap() {
    if (g.phase === 'active') resolve(performance.now() - g.startTime)
  }

  function handleBack() {
    if (view === 'menu') {
      onClose()
      return
    }
    stopCrowdAmbience()
    clearTimers()
    g.phase = 'menu'
    setView('menu')
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleTap()
      } else if (e.code === 'Escape') {
        handleBack()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) {
      if (g.phase !== 'menu' && g.phase !== 'end') startCrowdAmbience()
    } else {
      stopCrowdAmbience()
    }
  }

  function burstConfetti() {
    const canvas = confettiRef.current
    const field = fieldRef.current
    if (!canvas || !field) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = field.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const w = canvas.width
    const h = canvas.height
    const palette = ['#fbbf24', '#f97316', '#3b82f6', '#22c55e', '#ffffff']
    const particles = Array.from({ length: 42 }, () => ({
      x: w / 2,
      y: h * 0.15,
      vx: (Math.random() - 0.5) * 7,
      vy: -Math.random() * 3,
      size: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
      color: palette[Math.floor(Math.random() * palette.length)],
    }))
    const start = performance.now()
    cancelAnimationFrame(g.confettiRaf)
    const step = (now: number) => {
      const elapsed = now - start
      ctx.clearRect(0, 0, w, h)
      particles.forEach((p) => {
        p.vy += 0.26
        p.x += p.vx
        p.y += p.vy
        p.rot += p.spin
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6)
        ctx.restore()
      })
      if (elapsed < 900) g.confettiRaf = requestAnimationFrame(step)
      else ctx.clearRect(0, 0, w, h)
    }
    g.confettiRaf = requestAnimationFrame(step)
  }

  const pips = Array.from({ length: TOTAL_BALLS }, (_, i) => (i < ballIndex ? 'done' : i === ballIndex ? 'current' : ''))

  return (
    <div className="six-or-out-game" role="dialog" aria-label="Six or Out mini-game" aria-modal="true">
      <div className="soo-stage">
        <div className="soo-appbar">
          <button type="button" className="soo-icon-btn" title="Back" aria-label="Back" onClick={handleBack}>
            ←
          </button>
          <span className="soo-wordmark">MPL Auction Manager</span>
          <div className="soo-controls">
            <button
              type="button"
              className="soo-icon-btn"
              title={night ? 'Switch to day mode' : 'Switch to night mode'}
              aria-label={night ? 'Switch to day mode' : 'Switch to night mode'}
              onClick={() => setNight((v) => !v)}
            >
              {night ? '🌙' : '☀️'}
            </button>
            <button
              type="button"
              className="soo-icon-btn"
              title={soundOn ? 'Mute sound' : 'Unmute sound'}
              aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
              onClick={toggleSound}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {view === 'play' && <div ref={outcomeBannerRef} className="soo-banner" />}

        <div className="soo-game-area">
          {view === 'menu' && (
            <div className="soo-view">
              <div className="soo-title">
                <span className="six">SIX</span> <span className="or">or</span> <span className="out">OUT</span>
              </div>
              <p className="soo-sub">
                Bat: tap the instant the ball reaches you. Bowl: tap to release at the crease. Six balls, one wicket ends it.
              </p>
              <div className="soo-mode-row">
                <button type="button" className="soo-mode-btn bat" onClick={() => startInnings('bat')}>
                  <span className="glyph">🏏</span> Bat first
                </button>
                <button type="button" className="soo-mode-btn bowl" onClick={() => startInnings('bowl')}>
                  <span className="glyph">🎯</span> Bowl first
                </button>
              </div>
              <div className="soo-rules">
                <span className="soo-chip">DOT</span>
                <span className="soo-chip">1</span>
                <span className="soo-chip">2</span>
                <span className="soo-chip">4</span>
                <span className="soo-chip">6</span>
              </div>
            </div>
          )}

          {view === 'play' && (
            <div className="soo-view soo-view-play">
              <div className="soo-hud">
                <div className="soo-hud-block">
                  <div className="soo-hud-label">{hudLeftLabel}</div>
                  <div className="soo-hud-value">{hudLeftValue}</div>
                </div>
                <div className="soo-hud-block">
                  <div className="soo-hud-label">Ball</div>
                  <div className="soo-pips">
                    {pips.map((cls, i) => (
                      <span key={i} className={`soo-pip ${cls}`} />
                    ))}
                  </div>
                </div>
                <div className="soo-hud-block">
                  <div className="soo-hud-label">Wickets</div>
                  <div className="soo-hud-value">{hudRightValue}</div>
                </div>
              </div>
              <p className="soo-status">{statusText}</p>

              <div ref={fieldRef} className={`soo-field${shake ? ' soo-shake' : ''}${night ? ' night' : ''}`} onAnimationEnd={() => setShake(false)}>
                <div className="soo-crowd" aria-hidden="true" />
                <div className="soo-floodlight" style={{ left: '5%' }}>
                  <div className="pole" />
                  <div className="head">
                    <span className="bulb" />
                    <span className="bulb" />
                    <span className="bulb" />
                  </div>
                </div>
                <div className="soo-floodlight" style={{ left: '95%' }}>
                  <div className="pole" />
                  <div className="head">
                    <span className="bulb" />
                    <span className="bulb" />
                    <span className="bulb" />
                  </div>
                </div>
                <div className="soo-turf-oval" aria-hidden="true" />
                <div className="soo-pitch" aria-hidden="true">
                  <div className="soo-crease" />
                </div>
                <canvas ref={confettiRef} className="soo-confetti" />

                <div className="soo-fielder" style={{ left: '14%', top: '48%' }} />
                <div className="soo-fielder" style={{ left: '87%', top: '45%' }} />
                <div className="soo-fielder" style={{ left: '8%', top: '78%' }} />
                <div className="soo-fielder" style={{ left: '92%', top: '75%' }} />

                <div className="soo-stumps" style={{ left: `${CENTER_X}%`, top: `${FAR_Y - 3}%` }}>
                  <div className="soo-stump" />
                  <div className="soo-stump" />
                  <div className="soo-stump" />
                  <div ref={bail1Ref} className="soo-bail" />
                  <div ref={bail2Ref} className="soo-bail" style={{ left: 2 }} />
                </div>
                <div className="soo-stumps near" style={{ left: `${CENTER_X}%`, top: `${NEAR_Y + 2}%` }}>
                  <div className="soo-stump" />
                  <div className="soo-stump" />
                  <div className="soo-stump" />
                  <div ref={bail1NearRef} className="soo-bail" />
                  <div ref={bail2NearRef} className="soo-bail" style={{ left: 4 }} />
                </div>

                <div ref={bowlerFigRef} className="soo-figure" style={{ left: `${BOWLER_X}%`, top: `${FAR_Y}%` }}>
                  <div className="soo-bob">
                    <svg viewBox="0 0 34 54" aria-hidden="true">
                      <defs>
                        <linearGradient id="soo-jersey-orange" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#ffab54" />
                          <stop offset="1" stopColor="var(--orange)" />
                        </linearGradient>
                      </defs>
                      <rect x="11" y="38" width="6" height="14" rx="3" fill="#7c2d12" />
                      <rect x="19" y="38" width="6" height="14" rx="3" fill="#7c2d12" />
                      <rect x="9" y="16" width="16" height="24" rx="7" fill="url(#soo-jersey-orange)" />
                      <rect x="8" y="18" width="5" height="12" rx="2.5" fill="#fca5a5" />
                      <circle cx="17" cy="10" r="8.5" fill="#fca5a5" />
                      <path d="M8.5 8 a8.5 8.5 0 0 1 17 0 z" fill="#c2410c" />
                      <rect x="15" y="3" width="11" height="3.2" rx="1.6" fill="#c2410c" />
                      <ellipse cx="12.5" cy="12.5" rx="1.6" ry="1.1" fill="#fb7185" opacity="0.55" />
                      <ellipse cx="21.5" cy="12.5" rx="1.6" ry="1.1" fill="#fb7185" opacity="0.55" />
                      <circle cx="13.5" cy="10" r="1.5" fill="#1f2937" />
                      <circle cx="20.5" cy="10" r="1.5" fill="#1f2937" />
                      <circle cx="14" cy="9.5" r="0.5" fill="#fff" />
                      <circle cx="21" cy="9.5" r="0.5" fill="#fff" />
                      <path d="M14 14 q3 2.2 6 0" stroke="#1f2937" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                      <g ref={bowlArmRef} className="soo-bowl-arm">
                        <rect x="7" y="17" width="5" height="13" rx="2.5" fill="#fca5a5" />
                        <circle ref={handBallRef} className="soo-hand-ball" cx="9" cy="15" r="3.2" fill="#dc2626" />
                      </g>
                    </svg>
                  </div>
                </div>
                <div ref={batsmanFigRef} className="soo-figure" style={{ left: `${BATSMAN_X}%`, top: `${NEAR_Y}%` }}>
                  <div className="soo-bob">
                    <svg viewBox="0 0 34 54" aria-hidden="true">
                      <defs>
                        <linearGradient id="soo-jersey-blue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#5b9bff" />
                          <stop offset="1" stopColor="var(--blue)" />
                        </linearGradient>
                      </defs>
                      <rect x="11" y="38" width="6" height="14" rx="3" fill="#1e3a5f" />
                      <rect x="19" y="38" width="6" height="14" rx="3" fill="#1e3a5f" />
                      <rect x="9" y="16" width="16" height="24" rx="7" fill="url(#soo-jersey-blue)" />
                      <rect x="21" y="18" width="5" height="12" rx="2.5" fill="#fcd9a5" />
                      <circle cx="17" cy="10" r="8.5" fill="#fcd9a5" />
                      <path d="M8.5 8 a8.5 8.5 0 0 1 17 0 z" fill="#1e40af" />
                      <rect x="8.5" y="3" width="11" height="3.2" rx="1.6" fill="#1e40af" />
                      <ellipse cx="12.5" cy="12.5" rx="1.6" ry="1.1" fill="#fb923c" opacity="0.5" />
                      <ellipse cx="21.5" cy="12.5" rx="1.6" ry="1.1" fill="#fb923c" opacity="0.5" />
                      <circle cx="13.5" cy="10" r="1.5" fill="#1f2937" />
                      <circle cx="20.5" cy="10" r="1.5" fill="#1f2937" />
                      <circle cx="14" cy="9.5" r="0.5" fill="#fff" />
                      <circle cx="21" cy="9.5" r="0.5" fill="#fff" />
                      <path d="M14 14 q3 2.2 6 0" stroke="#1f2937" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                      <g ref={batRef} className="soo-bat">
                        <rect x="21" y="17" width="5" height="13" rx="2.5" fill="#fcd9a5" />
                        <rect x="23" y="3" width="3" height="17" rx="1.5" fill="#d6a15c" />
                      </g>
                    </svg>
                  </div>
                </div>

                <div ref={ballRef} className="soo-ball hidden" />

                <div className="soo-tap-target" onPointerDown={(e) => { e.preventDefault(); handleTap() }} />
                <div className="soo-tap-hint" style={{ visibility: tapHintVisible ? 'visible' : 'hidden' }}>
                  {tapHintText}
                </div>
              </div>
            </div>
          )}

          {view === 'end' && (
            <div className="soo-view">
              <div className="soo-result-card">
                <div className="soo-result-title">{result.title}</div>
                <div className="soo-result-score">{result.score}</div>
                <div className="soo-result-verdict">{result.verdict}</div>
              </div>
              <div className="soo-end-actions">
                <button type="button" className="soo-btn primary" onClick={() => startInnings(mode)}>
                  Play again
                </button>
                <button type="button" className="soo-btn" onClick={() => setView('menu')}>
                  Switch mode
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
