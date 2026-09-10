import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveDetectedLocation, type DetectedLocation } from '../lib/worldLocations'

export type DetectStatus = 'idle' | 'detecting' | 'done' | 'error' | 'unsupported'

// Reverse-geocodes the browser's current position onto the worldwide
// Country/State/City dataset. Uses the same public Nominatim endpoint the
// LocationAutocomplete already calls from the client.
//
// Auto-detects once on mount only when geolocation permission has *already*
// been granted — a first-time visitor gets no surprise prompt; they opt in
// by calling `detect()` (the "Use my location" button).
export function useDetectedLocation(): {
  status: DetectStatus
  detected: DetectedLocation | null
  detect: () => void
} {
  const [status, setStatus] = useState<DetectStatus>('idle')
  const [detected, setDetected] = useState<DetectedLocation | null>(null)
  const runningRef = useRef(false)

  const detect = useCallback(() => {
    if (runningRef.current) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    runningRef.current = true
    setStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: 'application/json' } },
          )
          const data = (await res.json()) as { address?: Record<string, string | undefined> }
          const resolved = await resolveDetectedLocation(data.address ?? {})
          if (resolved) {
            setDetected(resolved)
            setStatus('done')
          } else {
            setStatus('error')
          }
        } catch {
          setStatus('error')
        } finally {
          runningRef.current = false
        }
      },
      () => {
        setStatus('error')
        runningRef.current = false
      },
      { timeout: 10_000, maximumAge: 600_000 },
    )
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return
    let cancelled = false
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        if (!cancelled && result.state === 'granted') detect()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [detect])

  return { status, detected, detect }
}
