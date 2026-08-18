import { useEffect, useRef } from 'react'
import { Avatar } from './Avatar'
import { TeamAvatar } from './TeamAvatar'
import type { JustSoldPlayer } from '../hooks/useJustSoldPlayer'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { playSoldFanfare } from '../lib/sound'

const AUTO_DISMISS_MS = 3800
const IPL_CONFETTI_COLORS = ['#facc15', '#fb923c', '#3b82f6', '#f87171', '#34d399', '#ffffff']

// Full-screen "SOLD!" moment — hammer strike, confetti burst, and the
// winning team's reveal. Mounted once near the root of each auction page and
// driven entirely by useJustSoldPlayer, so it fires the instant a player's
// status flips to 'sold' regardless of which page (big screen or a
// bidder's phone) is watching.
export function SoldCelebration({ sold, onDone }: { sold: JustSoldPlayer | null; onDone: () => void }) {
  const reducedMotion = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sold) return
    playSoldFanfare()
    dismissTimerRef.current = setTimeout(onDone, AUTO_DISMISS_MS)
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sold?.player.playerId])

  useEffect(() => {
    if (!sold || reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isSmallScreen = window.innerWidth < 640
    const particleCount = isSmallScreen ? 60 : 130
    const accentColor = sold.team?.jerseyColor
    const palette = accentColor ? [accentColor, ...IPL_CONFETTI_COLORS] : IPL_CONFETTI_COLORS

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    const onResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const particles = Array.from({ length: particleCount }, () => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.4,
      y: height * 0.32 + (Math.random() - 0.5) * 40,
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
    const frameBudgetMs = 4200
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
      if (elapsed < frameBudgetMs) {
        raf = requestAnimationFrame(step)
      }
    }

    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      ctx.clearRect(0, 0, width, height)
    }
  }, [sold, reducedMotion])

  if (!sold) return null
  const { player, team } = sold
  const price = player.currentBid || player.basePrice

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden"
      style={{ animation: 'sold-backdrop-in 220ms ease-out' }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-gray-950/90 via-gray-950/94 to-black"
        style={{
          backgroundImage:
            'radial-gradient(720px circle at 50% 30%, rgba(250, 204, 21, 0.18), transparent 60%), linear-gradient(to bottom, rgba(3,7,18,0.92), rgba(3,7,18,0.97) 55%, #000 100%)',
        }}
      />

      {!reducedMotion && <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />}

      <div
        className="relative flex flex-col items-center px-6 text-center"
        style={!reducedMotion ? { animation: 'sold-impact-shake 380ms ease-out 520ms' } : undefined}
      >
        <div className="relative mb-2 h-20 w-20 sm:h-24 sm:w-24" aria-hidden="true">
          {!reducedMotion && (
            <span className="absolute inset-0 rounded-full border-4 border-amber-400/70" style={{ animation: 'sold-shockwave 700ms ease-out 480ms both' }} />
          )}
          <div
            className="absolute inset-0 flex items-center justify-center text-6xl sm:text-7xl"
            style={{
              transformOrigin: '85% 15%',
              animation: reducedMotion ? undefined : 'sold-hammer-swing 900ms cubic-bezier(.36,.07,.19,.97) both',
            }}
          >
            🔨
          </div>
        </div>

        <p
          className="bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-5xl font-black italic tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(251,191,36,0.35)] sm:text-7xl"
          style={{
            transform: 'rotate(-8deg)',
            animation: reducedMotion ? 'sold-detail-in 260ms ease-out both' : 'sold-stamp-in 620ms cubic-bezier(.2,1.4,.4,1) 560ms both',
          }}
        >
          SOLD!
        </p>

        <div
          className="mt-6 flex flex-col items-center gap-3"
          style={{ animation: 'sold-detail-in 420ms ease-out 900ms both' }}
        >
          <Avatar
            name={player.name}
            encryptedPhoto={player.encryptedPhoto}
            photoURL={player.photoURL}
            avatarId={player.avatarId}
            shape="square"
            size={40}
          />
          <div>
            <p className="text-xl font-semibold text-white sm:text-2xl">{player.name}</p>
            <p className="text-sm text-gray-400">{player.position}</p>
          </div>

          <p className="mt-1 font-mono text-4xl font-bold text-white sm:text-5xl">{price}</p>

          {team && (
            <div className="mt-1 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
              <TeamAvatar teamName={team.name} logoId={team.logoId} logoImage={team.logoImage} jerseyColor={team.jerseyColor} size={6} />
              <span className="text-sm font-medium text-gray-100">{team.name}</span>
            </div>
          )}
        </div>

        <p
          className="mt-8 text-xs uppercase tracking-widest text-gray-500"
          style={{ animation: 'sold-detail-in 420ms ease-out 1300ms both' }}
        >
          Tap anywhere to continue
        </p>
      </div>
    </div>
  )
}
