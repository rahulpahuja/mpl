import { useNavigate } from 'react-router-dom'
import { SPORTS } from '../lib/sports'

// Every sport the platform lists, collapsed into one top-bar dropdown.
// Cricket is the only one wired up today, so the rest render disabled with a
// "soon" hint — give a sport a `to` in lib/sports.ts to make it selectable.
export function SportSwitcher() {
  const navigate = useNavigate()

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Choose sport</span>
      <span
        className="material-symbols-outlined text-[18px] text-gray-500 dark:text-gray-400"
        aria-hidden="true"
      >
        sports
      </span>
      <select
        defaultValue="cricket"
        onChange={(e) => {
          const sport = SPORTS.find((s) => s.id === e.target.value)
          if (sport?.to) navigate(sport.to)
        }}
        className="rounded-md border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 px-2 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-100"
      >
        {SPORTS.map((s) => (
          <option key={s.id} value={s.id} disabled={!s.to}>
            {s.icon} {s.name}
            {s.to ? '' : ' · soon'}
          </option>
        ))}
      </select>
    </label>
  )
}
