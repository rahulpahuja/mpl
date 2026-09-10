import { useEffect, useState } from 'react'
import { ANY } from '../lib/venueLocations'
import {
  type LocationValue,
  withCity,
  withCountry,
  withState,
} from '../lib/sportLocationFilter'
import { getCities, getCountries, getStates, type WorldCountry } from '../lib/worldLocations'

const SELECT_CLASS = 'aa-input disabled:opacity-50'
const LABEL_CLASS = 'flex flex-1 flex-col gap-1 min-w-0'

// Three cascading Country -> State -> City <select>s backed by the
// worldwide dataset (lib/worldLocations.ts). Controlled; the parent owns
// the layout container (flex row on the directory filter, grid in Auction
// Setup). Options load progressively: countries on mount, a country's
// states when it's picked, a state's cities when it's picked.
export function LocationCascade({
  value,
  onChange,
}: {
  value: LocationValue
  onChange: (value: LocationValue) => void
}) {
  const [countries, setCountries] = useState<WorldCountry[]>([])
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)

  useEffect(() => {
    let active = true
    getCountries()
      .then((list) => active && setCountries(list))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (value.countryCode === ANY) {
      setStates([])
      return
    }
    let active = true
    getStates(value.countryCode)
      .then((list) => active && setStates(list))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [value.countryCode])

  useEffect(() => {
    if (value.countryCode === ANY || value.state === ANY) {
      setCities([])
      return
    }
    let active = true
    setCitiesLoading(true)
    getCities(value.countryCode, value.state)
      .then((list) => active && setCities(list))
      .catch(() => {})
      .finally(() => active && setCitiesLoading(false))
    return () => {
      active = false
    }
  }, [value.countryCode, value.state])

  return (
    <>
      <label className={LABEL_CLASS}>
        <span className="aa-label">Country</span>
        <select
          value={value.countryCode}
          disabled={countries.length === 0}
          onChange={(e) => {
            const picked = countries.find((c) => c.code === e.target.value)
            onChange(withCountry(value, e.target.value, picked?.name ?? ANY))
          }}
          className={SELECT_CLASS}
        >
          <option value={ANY}>Any country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.emoji ? `${c.emoji} ` : ''}
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className={LABEL_CLASS}>
        <span className="aa-label">State / Province</span>
        <select
          value={value.state}
          disabled={value.countryCode === ANY || states.length === 0}
          onChange={(e) => onChange(withState(value, e.target.value))}
          className={SELECT_CLASS}
        >
          <option value={ANY}>Any state / province</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className={LABEL_CLASS}>
        <span className="aa-label">City</span>
        <select
          value={value.city}
          disabled={value.state === ANY || citiesLoading || cities.length === 0}
          onChange={(e) => onChange(withCity(value, e.target.value))}
          className={SELECT_CLASS}
        >
          <option value={ANY}>{citiesLoading ? 'Loading cities…' : 'Any city'}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
