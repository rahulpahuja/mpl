import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

// A cricket ball rockets in and detonates into the MPL wordmark, reusing the
// same gold-impact grammar as SoldCelebration so every "arriving somewhere
// new" moment in the app reads as one system. Plays once on the initial app
// load, then replays on every route change (see the pathname effect below)
// — it also conveniently masks the blank gap while a lazily-loaded route
// chunk fetches, since <Suspense fallback={null}> would otherwise flash empty.
// Every animation-duration/delay below is expressed as ms(baseMs) so the
// whole sequence speeds up or slows down together from this one knob.
const SPEED = 0.62
const HOLD_MS = 620
const FADE_MS = 160
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

function ms(baseMs: number) {
  return `${Math.round(baseMs * SPEED)}ms`
}

export function SplashScreen() {
  const { pathname } = useLocation()
  const reducedMotion = usePrefersReducedMotion()
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  const [playKey, setPlayKey] = useState(0)
  const isFirstRender = useRef(true)

  // Replay on every page navigation — skip the very first run, since the
  // mount-time effect below already plays the initial cold-open.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPlayKey((k) => k + 1)
    setVisible(true)
    setFading(false)
  }, [pathname])

  useEffect(() => {
    const holdMs = reducedMotion ? 120 : HOLD_MS
    const fadeTimer = setTimeout(() => setFading(true), holdMs)
    const doneTimer = setTimeout(() => setVisible(false), holdMs + FADE_MS)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [reducedMotion, playKey])

  if (!visible) return null

  return (
    <div
      key={playKey}
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
        style={!reducedMotion ? { animation: `splash-shake ${ms(240)} ease-out ${ms(255)} both` } : undefined}
      >
        {!reducedMotion && (
          <>
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <Ball ghost blur={2} delay={ms(-72)} />
              <Ball ghost blur={1} delay={ms(-38)} />
              <Ball blur={0} delay="0ms" />
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="absolute h-10 w-10 rounded-full opacity-0"
                style={{
                  background: 'radial-gradient(circle, #fff 0%, #fbbf24 35%, transparent 72%)',
                  animation: `splash-flash-pop ${ms(260)} ease-out ${ms(250)} both`,
                }}
              />
              <span
                className="absolute h-10 w-10 rounded-full border-2 opacity-0"
                style={{ borderColor: '#fbbf24', animation: `splash-ring-out ${ms(520)} ease-out ${ms(255)} both` }}
              />
              <span
                className="absolute h-10 w-10 rounded-full border-2 opacity-0"
                style={{ borderColor: '#f97316', animation: `splash-ring-out ${ms(520)} ease-out ${ms(320)} both` }}
              />
              {SPARK_ANGLES.map((angle) => (
                <span
                  key={angle}
                  className="absolute top-1/2 left-1/2 h-[5px] w-[5px] rounded-[1px] opacity-0"
                  style={
                    {
                      background: '#fbbf24',
                      '--sa': `${angle}deg`,
                      animation: `splash-spark-out ${ms(420)} ease-out ${ms(258)} both`,
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
              animation: reducedMotion
                ? undefined
                : `splash-mark-in ${ms(340)} cubic-bezier(.2,1.5,.4,1) ${ms(300)} both`,
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
                  animation: `splash-shimmer-sweep ${ms(340)} ease-out ${ms(640)} both`,
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
              animation: reducedMotion ? undefined : `splash-tagline-in ${ms(280)} ease-out ${ms(560)} both`,
            }}
          >
            Auction Manager
          </p>

          <span
            className="h-0.5 rounded-full bg-gradient-to-r from-blue-700 to-orange-500"
            style={{
              width: reducedMotion ? '4.5rem' : 0,
              animation: reducedMotion ? undefined : `splash-underline-draw ${ms(240)} ease-out ${ms(700)} both`,
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
        animation: `${ghost ? 'splash-ball-fly-ghost' : 'splash-ball-fly'} ${ms(260)} cubic-bezier(.3,.1,.4,1) ${delay} both`,
      }}
    />
  )
}
