// Shared canvas particle-burst engine, extracted out of SoldCelebration.tsx
// so the four/six/wicket celebrations (BallCelebration.tsx) can reuse the
// exact same physics/rendering instead of re-implementing it. Behavior here
// is a verbatim port of SoldCelebration's original inline effect — same
// gravity/drag constants, same particle shape mix — just parameterized by
// palette/count/duration/origin instead of hardcoded.
export interface ConfettiOptions {
  palette: string[]
  // Defaults mirror SoldCelebration's original inline values: fewer
  // particles on small screens, ~4.2s burst.
  particleCount?: number
  durationMs?: number
  // Where the burst originates vertically, as a fraction of canvas height
  // (0 = top, 1 = bottom). Matches SoldCelebration's original 0.32.
  originYFraction?: number
}

// Runs the burst on the given canvas and returns a cleanup function that
// cancels the animation frame and removes the resize listener — call it on
// unmount, same as SoldCelebration's effect cleanup did inline.
export function runConfettiBurst(canvas: HTMLCanvasElement, options: ConfettiOptions): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const isSmallScreen = window.innerWidth < 640
  const {
    palette,
    particleCount = isSmallScreen ? 60 : 130,
    durationMs = 4200,
    originYFraction = 0.32,
  } = options

  let width = (canvas.width = window.innerWidth)
  let height = (canvas.height = window.innerHeight)
  const onResize = () => {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
  }
  window.addEventListener('resize', onResize)

  const particles = Array.from({ length: particleCount }, () => ({
    x: width / 2 + (Math.random() - 0.5) * width * 0.4,
    y: height * originYFraction + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 11 - 4,
    size: 5 + Math.random() * 6,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.35,
    color: palette[Math.floor(Math.random() * palette.length)],
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }))

  const gravity = 0.32
  const drag = 0.992
  let raf = 0
  let elapsed = 0
  let lastTime = performance.now()

  const step = (now: number) => {
    const dt = now - lastTime
    lastTime = now
    elapsed += dt
    ctx.clearRect(0, 0, width, height)
    for (const p of particles) {
      p.vx *= drag
      p.vy = p.vy * drag + gravity
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.spin
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (elapsed < durationMs) {
      raf = requestAnimationFrame(step)
    }
  }

  raf = requestAnimationFrame(step)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    ctx.clearRect(0, 0, width, height)
  }
}
