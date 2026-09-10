import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ANY } from '../lib/venueLocations'
import { type LocationValue, summarizeLocation, withDetected } from '../lib/sportLocationFilter'
import { useDetectedLocation, type DetectStatus } from '../hooks/useDetectedLocation'
import { useLocationFilterStore } from '../store/locationFilterStore'
import { LocationCascade } from './LocationCascade'

const DETECT_LABEL: Record<DetectStatus, string> = {
  idle: 'Use my location',
  detecting: 'Detecting…',
  done: 'Located',
  error: "Couldn't detect — pick manually",
  unsupported: 'Location unavailable',
}

// Top-bar location context, parallel to the sport selector. Shows the
// current selection; clicking opens a dialog with the Country -> State ->
// City cascade plus a geolocation auto-detect. Applied on "Apply" so
// partial edits don't churn the store.
export function LocationButton() {
  const location = useLocationFilterStore((s) => s.location)
  const setLocation = useLocationFilterStore((s) => s.setLocation)
  const clearLocation = useLocationFilterStore((s) => s.clearLocation)
  const { status, detected, detect } = useDetectedLocation()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<LocationValue>(location)
  const autoAppliedRef = useRef(false)

  // A detection result updates the working draft, and — the first time, and
  // only if the user hasn't chosen a location yet — is applied globally so
  // the hub is scoped to where they are without any interaction.
  useEffect(() => {
    if (!detected) return
    setDraft((d) => withDetected(d, detected))
    if (!autoAppliedRef.current) {
      autoAppliedRef.current = true
      const current = useLocationFilterStore.getState().location
      if (current.country === ANY) setLocation(withDetected(current, detected))
    }
  }, [detected, setLocation])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function openDialog() {
    setDraft(location)
    setOpen(true)
    if (status === 'idle') detect()
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        title="Choose location"
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm font-medium ${
          location.country !== ANY
            ? 'border-orange-400/70 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300'
            : 'border-gray-200/80 bg-white/70 text-gray-800 dark:border-gray-800/80 dark:bg-gray-900/60 dark:text-gray-100'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          location_on
        </span>
        <span className="max-w-[9rem] truncate sm:max-w-[14rem]">{summarizeLocation(location)}</span>
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose location"
            className="apex-arena fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
            onClick={() => setOpen(false)}
          >
            <div className="aa-shell w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="aa-head text-lg">Choose location</h2>
                <button onClick={() => setOpen(false)} className="text-sm aa-dim hover:underline">
                  Close
                </button>
              </div>
              <p className="mt-1 text-sm aa-dim">
                Scope the landing hub to a country, state and city.
              </p>

              <button
                type="button"
                onClick={detect}
                disabled={status === 'detecting' || status === 'unsupported'}
                className="aa-btn aa-btn-ghost mt-4 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  my_location
                </span>
                {DETECT_LABEL[status]}
              </button>

              <div className="mt-3 grid gap-3">
                <LocationCascade value={draft} onChange={setDraft} />
              </div>

              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    clearLocation()
                    setOpen(false)
                  }}
                  className="text-sm font-medium aa-orange-text hover:underline"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocation(draft)
                    setOpen(false)
                  }}
                  className="aa-btn aa-btn-primary"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
