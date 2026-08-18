import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

// Cold-open splash: a cricket ball rockets in and detonates into the MPL
// wordmark, reusing the same gold-impact grammar as SoldCelebration so the
// two moments read as one system. Mounted once at the app root (see App.tsx)
// — it only ever plays on a real page load, never on client-side route
// navigation, which is exactly when a native app would show one.
const HOLD_MS = 950
const FADE_MS = 260
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

export function SplashScreen() {
  const reducedMotion = usePrefersReducedMotion()
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const holdMs = reducedMotion ? 120 : HOLD_MS
    const fadeTimer = setTimeout(() => setFading(true), holdMs)
    const doneTimer = setTimeout(() => setVisible(false), holdMs + FADE_MS)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [reducedMotion])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden transition-opacity ease-out"
      style={{
        opacity: fading ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        background:
          'radial-gradient(620px circle at 18% -6%, rgba(59,130,246,0.28), transparent 60%), radial-gradient(620px circle at 100% 8%, rgba(255,140,26,0.22), transparent 55%), linear-gradient(180deg, #0a1120 0%, #071b12 65%)',
      }}
    >
      <div
        className="relative flex h-[220px] w-[220px] items-center justify-center"
        style={!reducedMotion ? { animation: 'splash-shake 240ms ease-out 255ms both' } : undefined}
      >
        {!reducedMotion && (
          <>
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <Ball ghost blur={2} delay="-72ms" />
              <Ball ghost blur={1} delay="-38ms" />
              <Ball blur={0} delay="0ms" />
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="absolute h-10 w-10 rounded-full opacity-0"
                style={{
                  background: 'radial-gradient(circle, #fff 0%, #fbbf24 35%, transparent 72%)',
                  animation: 'splash-flash-pop 260ms ease-out 250ms both',
                }}
              />
              <span
                className="absolute h-10 w-10 rounded-full border-2 opacity-0"
                style={{ borderColor: '#fbbf24', animation: 'splash-ring-out 520ms ease-out 255ms both' }}
              />
              <span
                className="absolute h-10 w-10 rounded-full border-2 opacity-0"
                style={{ borderColor: '#f97316', animation: 'splash-ring-out 520ms ease-out 320ms both' }}
              />
              {SPARK_ANGLES.map((angle) => (
                <span
                  key={angle}
                  className="absolute top-1/2 left-1/2 h-[5px] w-[5px] rounded-[1px] opacity-0"
                  style={
                    {
                      background: '#fbbf24',
                      '--sa': `${angle}deg`,
                      animation: 'splash-spark-out 420ms ease-out 258ms both',
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </>
        )}

        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <div
            className="relative bg-gradient-to-r from-blue-700 to-orange-500 bg-clip-text text-5xl font-black tracking-tight text-transparent"
            style={{
              opacity: reducedMotion ? 1 : 0,
              animation: reducedMotion ? undefined : 'splash-mark-in 340ms cubic-bezier(.2,1.5,.4,1) 300ms both',
            }}
          >
            MPL
            {!reducedMotion && (
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-clip-text text-transparent opacity-0"
                style={{
                  backgroundImage:
                    'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.85) 50%, transparent 60%)',
                  backgroundSize: '260% 100%',
                  backgroundPosition: '-140% 0',
                  animation: 'splash-shimmer-sweep 340ms ease-out 640ms both',
                }}
              >
                MPL
              </span>
            )}
          </div>

          <p
            className="text-[11px] font-bold tracking-[0.32em] text-gray-400 uppercase"
            style={{
              opacity: reducedMotion ? 1 : 0,
              transform: reducedMotion ? 'none' : 'translateY(6px)',
              animation: reducedMotion ? undefined : 'splash-tagline-in 280ms ease-out 560ms both',
            }}
          >
            Auction Manager
          </p>

          <span
            className="h-0.5 rounded-full bg-gradient-to-r from-blue-700 to-orange-500"
            style={{
              width: reducedMotion ? '4.5rem' : 0,
              animation: reducedMotion ? undefined : 'splash-underline-draw 240ms ease-out 700ms both',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function Ball({ ghost, blur, delay }: { ghost?: boolean; blur: number; delay: string }) {
  return (
    <span
      className="absolute h-[22px] w-[22px] rounded-full opacity-0"
      style={{
        background: 'radial-gradient(circle at 32% 28%, #f87171, #dc2626 55%, #7f1d1d 100%)',
        filter: blur ? `blur(${blur}px)` : undefined,
        animation: `${ghost ? 'splash-ball-fly-ghost' : 'splash-ball-fly'} 260ms cubic-bezier(.3,.1,.4,1) ${delay} both`,
      }}
    />
  )
}
