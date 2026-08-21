import { useEffect, useRef } from 'react'
import { Avatar } from './Avatar'
import { TeamAvatar } from './TeamAvatar'
import type { JustSoldPlayer } from '../hooks/useJustSoldPlayer'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { runConfettiBurst } from '../lib/confettiEngine'
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
  }, [sold?.players[0]?.playerId])

  useEffect(() => {
    if (!sold || reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const accentColor = sold.team?.jerseyColor
    const palette = accentColor ? [accentColor, ...IPL_CONFETTI_COLORS] : IPL_CONFETTI_COLORS
    return runConfettiBurst(canvas, { palette })
  }, [sold, reducedMotion])

  if (!sold) return null
  const { players, team } = sold
  const isCombo = players.length > 1
  const totalPrice = players.reduce((sum, p) => sum + (p.currentBid || p.basePrice), 0)

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
          {isCombo ? (
            <div className="flex flex-wrap items-center justify-center gap-4">
              {players.map((p) => (
                <div key={p.playerId} className="flex flex-col items-center gap-1">
                  <Avatar
                    name={p.name}
                    encryptedPhoto={p.encryptedPhoto}
                    photoURL={p.photoURL}
                    avatarId={p.avatarId}
                    shape="square"
                    size={32}
                  />
                  <p className="max-w-[6rem] truncate text-sm font-medium text-white">{p.name}</p>
                  <p className="font-mono text-xs text-gray-400">{p.currentBid}</p>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Avatar
                name={players[0].name}
                encryptedPhoto={players[0].encryptedPhoto}
                photoURL={players[0].photoURL}
                avatarId={players[0].avatarId}
                shape="square"
                size={40}
              />
              <div>
                <p className="text-xl font-semibold text-white sm:text-2xl">{players[0].name}</p>
                <p className="text-sm text-gray-400">{players[0].position}</p>
              </div>
            </>
          )}

          <p className="mt-1 font-mono text-4xl font-bold text-white sm:text-5xl">{totalPrice}</p>
          {isCombo && (
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Combo of {players.length} · split equally
            </p>
          )}

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
