import { useEffect, useRef } from 'react'
import { SPORTS } from '../lib/sports'
import { ANY } from '../lib/venueLocations'
import { type SportLocationValue, withDetected } from '../lib/sportLocationFilter'
import { useDetectedLocation, type DetectStatus } from '../hooks/useDetectedLocation'
import { LocationCascade } from './LocationCascade'

const DETECT_LABEL: Record<DetectStatus, string> = {
  idle: 'Use my location',
  detecting: 'Detecting…',
  done: 'Location detected',
  error: "Couldn't detect — pick manually",
  unsupported: 'Location not available',
}

// Top-of-page control strip for the Auctions Directory: which sport, and
// where (a worldwide Country -> State -> City cascade). Auto-detects the
// viewer's location — automatically when geolocation permission was already
// granted, otherwise on the "Use my location" button.
export function SportLocationFilter({
  value,
  onChange,
}: {
  value: SportLocationValue
  onChange: (value: SportLocationValue) => void
}) {
  const { status, detected, detect } = useDetectedLocation()

  // Apply a detection result once (keyed only on `detected`), keeping any
  // sport the user already chose.
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  onChangeRef.current = onChange
  valueRef.current = value
  useEffect(() => {
    if (detected) onChangeRef.current(withDetected(valueRef.current, detected))
  }, [detected])

  return (
    <div className="aa-panel flex flex-col gap-3 p-3 lg:flex-row lg:items-end">
      <label className="flex flex-1 flex-col gap-1 min-w-0">
        <span className="aa-label">Sport</span>
        <select
          value={value.sport}
          onChange={(e) => onChange({ ...value, sport: e.target.value })}
          className="aa-input"
        >
          <option value={ANY}>All sports</option>
          {SPORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
      </label>

      <LocationCascade value={value} onChange={(next) => onChange({ ...value, ...next })} />

      <button
        type="button"
        onClick={detect}
        disabled={status === 'detecting' || status === 'unsupported'}
        className="aa-btn aa-btn-ghost shrink-0 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          my_location
        </span>
        {DETECT_LABEL[status]}
      </button>
    </div>
  )
}
