import { useEffect, useRef } from 'react'
import type { JustScoredEvent } from '../hooks/useJustScored'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { runConfettiBurst } from '../lib/confettiEngine'
import { playBoundaryFour, playBoundarySix, playWicketSound } from '../lib/sound'

const FOUR_PALETTE = ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff']
const SIX_PALETTE = ['#22c55e', '#facc15', '#4ade80', '#fde047', '#ffffff']
const WICKET_PALETTE = ['#dc2626', '#f87171', '#fca5a5', '#ffffff']

// Full-screen four/six/wicket moment for the live scorer and public viewer —
// built on the same canvas particle engine and overlay treatment as
// SoldCelebration.tsx, just fed by useJustScored instead of
// useJustSoldPlayer, and considerably shorter-lived since these fire far
// more often than a single "SOLD!" moment per player.
export function BallCelebration({ event, onDone }: { event: JustScoredEvent | null; onDone: () => void }) {
  const reducedMotion = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const kind = event?.isWicket ? 'wicket' : event?.isBoundary === 6 ? 'six' : event?.isBoundary === 4 ? 'four' : null

  useEffect(() => {
    if (!kind) return
    if (kind === 'wicket') playWicketSound()
    else if (kind === 'six') playBoundarySix()
    else playBoundaryFour()
    const dismissMs = kind === 'wicket' ? 3500 : 2500
    dismissTimerRef.current = setTimeout(onDone, dismissMs)
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  useEffect(() => {
    if (!kind || reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const palette = kind === 'wicket' ? WICKET_PALETTE : kind === 'six' ? SIX_PALETTE : FOUR_PALETTE
    return runConfettiBurst(canvas, {
      palette,
      particleCount: kind === 'six' ? 150 : kind === 'wicket' ? 90 : 100,
      durationMs: kind === 'six' ? 2800 : kind === 'wicket' ? 2200 : 2000,
    })
  }, [kind, reducedMotion])

  if (!kind) return null

  const label = kind === 'wicket' ? 'OUT!' : kind === 'six' ? 'SIX!' : 'FOUR!'
  const emoji = kind === 'wicket' ? '🏏' : kind === 'six' ? '🚀' : '🔥'
  const gradient =
    kind === 'wicket'
      ? 'from-red-400 via-red-500 to-rose-600'
      : kind === 'six'
        ? 'from-emerald-300 via-green-400 to-yellow-400'
        : 'from-sky-300 via-blue-400 to-blue-500'

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden"
      style={{ animation: 'sold-backdrop-in 180ms ease-out' }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-gray-950/85 via-gray-950/90 to-black"
        style={{
          backgroundImage:
            'radial-gradient(680px circle at 50% 35%, rgba(255,255,255,0.12), transparent 60%), linear-gradient(to bottom, rgba(3,7,18,0.88), rgba(3,7,18,0.95) 55%, #000 100%)',
        }}
      />

      {!reducedMotion && <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />}

      <div
        className="relative flex flex-col items-center px-6 text-center"
        style={!reducedMotion ? { animation: 'sold-impact-shake 340ms ease-out 380ms' } : undefined}
      >
        <div
          className="text-6xl sm:text-7xl"
          style={{ animation: reducedMotion ? undefined : 'sold-hammer-swing 700ms cubic-bezier(.36,.07,.19,.97) both' }}
        >
          {emoji}
        </div>
        <p
          className={`bg-gradient-to-b ${gradient} bg-clip-text text-6xl font-black italic tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(255,255,255,0.25)] sm:text-8xl`}
          style={{
            transform: 'rotate(-6deg)',
            animation: reducedMotion ? 'sold-detail-in 220ms ease-out both' : 'sold-stamp-in 520ms cubic-bezier(.2,1.4,.4,1) 420ms both',
          }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}
