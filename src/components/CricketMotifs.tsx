import { useEffect, useRef, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { useBackdropStore } from '../store/backdropStore'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

// Per-layer parallax depth. `pointer` is the px of travel at full cursor
// deflection; `scroll` shifts the layer as the page scrolls (negative =
// drifts up). Larger values read as "closer" to the viewer.
const LAYERS = {
  stadium: { pointer: 8, scroll: -0.04 },
  ballRed: { pointer: 26, scroll: -0.06 },
  ballWhite: { pointer: 18, scroll: -0.05 },
  bat: { pointer: 34, scroll: -0.08 },
} as const

function layerStyle(depth: { pointer: number; scroll: number }): CSSProperties {
  return {
    transform: `translate3d(calc(var(--mx) * ${depth.pointer}px), calc(var(--my) * ${depth.pointer}px + var(--sy) * ${depth.scroll}px), 0)`,
    transition: 'transform 300ms ease-out',
    willChange: 'transform',
  }
}

export function CricketMotifs() {
  const venuePhotoActive = useBackdropStore((s) => s.venuePhotoActive)
  const reducedMotion = usePrefersReducedMotion()
  const { pathname } = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)

  // Parallax is a home-screen flourish only — elsewhere the motifs stay put.
  const parallaxOn = !reducedMotion && (pathname === '/' || pathname === '/home')

  useEffect(() => {
    const el = containerRef.current
    if (!el || !parallaxOn) return

    let frame = 0
    let mx = 0
    let my = 0
    let sy = window.scrollY

    const apply = () => {
      frame = 0
      el.style.setProperty('--mx', String(mx))
      el.style.setProperty('--my', String(my))
      el.style.setProperty('--sy', String(sy))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }
    const onPointerMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5
      my = e.clientY / window.innerHeight - 0.5
      schedule()
    }
    const onScroll = () => {
      sy = window.scrollY
      schedule()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      el.style.removeProperty('--mx')
      el.style.removeProperty('--my')
      el.style.removeProperty('--sy')
    }
  }, [parallaxOn])

  if (venuePhotoActive) return null

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ '--mx': 0, '--my': 0, '--sy': 0 } as CSSProperties}
    >
      <img
        src="/motifs/stadium.jpg"
        alt=""
        className="absolute bottom-0 left-0 h-56 w-full object-cover object-bottom opacity-60 sm:h-96"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 35%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 35%)',
          ...(parallaxOn ? layerStyle(LAYERS.stadium) : null),
        }}
      />
      <img
        src="/motifs/ball-red.png"
        alt=""
        className="absolute left-6 top-20 h-12 w-12 opacity-40 sm:h-14 sm:w-14"
        style={parallaxOn ? layerStyle(LAYERS.ballRed) : undefined}
      />
      <img
        src="/motifs/ball-white.png"
        alt=""
        className="absolute bottom-24 left-10 h-10 w-10 opacity-30 sm:h-12 sm:w-12"
        style={parallaxOn ? layerStyle(LAYERS.ballWhite) : undefined}
      />
      <img
        src="/motifs/bat.png"
        alt=""
        className="absolute bottom-6 right-6 h-28 w-28 opacity-45 sm:h-36 sm:w-36"
        style={parallaxOn ? layerStyle(LAYERS.bat) : undefined}
      />
    </div>
  )
}
