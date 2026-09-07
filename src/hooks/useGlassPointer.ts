import { useEffect } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

// Drives the pointer-follow light (--gx/--gy) and subtle tilt (--rx/--ry) on
// every `.glass-card-hoverable` from a single document-level listener, so no
// card needs per-instance wiring. Skipped entirely for reduced-motion and
// touch (no-hover) users. Mounted once at the app root.
const TILT_X_DEG = 3.5
const TILT_Y_DEG = 4.5

export function useGlassPointer() {
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion || window.matchMedia('(hover: none)').matches) return

    let frame = 0
    let current: HTMLElement | null = null
    let clientX = 0
    let clientY = 0

    const clear = (el: HTMLElement | null) => {
      if (!el) return
      for (const prop of ['--gx', '--gy', '--rx', '--ry']) el.style.removeProperty(prop)
    }

    const apply = () => {
      frame = 0
      if (!current) return
      const rect = current.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const px = (clientX - rect.left) / rect.width
      const py = (clientY - rect.top) / rect.height
      current.style.setProperty('--gx', `${(px * 100).toFixed(2)}%`)
      current.style.setProperty('--gy', `${(py * 100).toFixed(2)}%`)
      current.style.setProperty('--rx', `${((0.5 - py) * 2 * TILT_X_DEG).toFixed(2)}deg`)
      current.style.setProperty('--ry', `${((px - 0.5) * 2 * TILT_Y_DEG).toFixed(2)}deg`)
    }

    const onMove = (e: PointerEvent) => {
      const next =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>('.glass-card-hoverable')
          : null
      if (next !== current) {
        clear(current)
        current = next
      }
      if (!current) return
      clientX = e.clientX
      clientY = e.clientY
      if (!frame) frame = requestAnimationFrame(apply)
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      document.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
      clear(current)
    }
  }, [reducedMotion])
}
