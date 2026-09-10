// Worldwide Country -> State -> City data, sourced from the MIT-licensed
// `countrycitystatejson` package.
//
// Loading is progressive and code-split:
//  - `countrycitystatejson/countries` (countries + state names, ~62KB gz)
//    loads the first time any helper runs — i.e. when a location picker
//    opens.
//  - City data is one JSON file per country; Vite turns each into its own
//    lazy chunk and only the picked country's is ever fetched.
// Results are memoised so each dataset is parsed once per session.

import { ANY } from './venueLocations'

type CountriesModule = typeof import('countrycitystatejson/countries')

interface CountryCityData {
  states: Record<string, { name: string }[]>
}

// The per-country files live outside the package's `exports` map, so they're
// referenced by their full path within node_modules.
const cityLoaders = import.meta.glob<CountryCityData>(
  '/node_modules/countrycitystatejson/dist/esm/lib/by-country/*.json',
  { import: 'default' },
)

export interface WorldCountry {
  code: string
  name: string
  emoji: string
}

let countriesModP: Promise<CountriesModule> | undefined
const loadCountriesMod = () => (countriesModP ??= import('countrycitystatejson/countries'))

let countriesCache: WorldCountry[] | undefined
const statesCache = new Map<string, string[]>()
const citiesCache = new Map<string, string[]>()

const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

export async function getCountries(): Promise<WorldCountry[]> {
  if (!countriesCache) {
    const mod = await loadCountriesMod()
    countriesCache = mod
      .getCountries()
      .map((c) => ({ code: c.shortName, name: c.name ?? c.shortName, emoji: c.emoji ?? '' }))
      .sort((a, b) => collator.compare(a.name, b.name))
  }
  return countriesCache
}

export async function getStates(countryCode: string): Promise<string[]> {
  if (!countryCode || countryCode === ANY) return []
  let cached = statesCache.get(countryCode)
  if (!cached) {
    const mod = await loadCountriesMod()
    cached = [...(mod.getStatesByShort(countryCode) ?? [])].sort((a, b) => collator.compare(a, b))
    statesCache.set(countryCode, cached)
  }
  return cached
}

export async function getCities(countryCode: string, state: string): Promise<string[]> {
  if (!countryCode || !state || countryCode === ANY || state === ANY) return []
  const key = `${countryCode}/${state}`
  let cached = citiesCache.get(key)
  if (!cached) {
    const loader =
      cityLoaders[`/node_modules/countrycitystatejson/dist/esm/lib/by-country/${countryCode}.json`]
    if (!loader) return []
    const data = await loader()
    cached = (data.states?.[state] ?? [])
      .map((c) => c.name)
      .filter(Boolean)
      .sort((a, b) => collator.compare(a, b))
    citiesCache.set(key, cached)
  }
  return cached
}

export interface DetectedLocation {
  countryCode: string
  country: string
  state: string
  city: string
}

const norm = (s: string | undefined) => s?.trim().toLowerCase() ?? ''

// Maps a Nominatim reverse-geocode `address` block onto the dataset,
// resolving each level as far as it matches and leaving the rest as ANY.
// Returns null only when the country itself can't be identified.
export async function resolveDetectedLocation(
  address: Record<string, string | undefined>,
): Promise<DetectedLocation | null> {
  const countries = await getCountries()
  const iso = address.country_code?.toUpperCase()
  const country =
    (iso ? countries.find((c) => c.code === iso) : undefined) ??
    countries.find((c) => norm(c.name) === norm(address.country))
  if (!country) return null

  const resolved: DetectedLocation = {
    countryCode: country.code,
    country: country.name,
    state: ANY,
    city: ANY,
  }

  const stateNames = [address.state, address.state_district, address.region, address.county]
    .map(norm)
    .filter(Boolean)
  const states = await getStates(country.code)
  const state = states.find((s) => stateNames.includes(norm(s)))
  if (!state) return resolved
  resolved.state = state

  const cityNames = [
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.suburb,
  ]
    .map(norm)
    .filter(Boolean)
  const cities = await getCities(country.code, state)
  const city = cities.find((c) => cityNames.includes(norm(c)))
  if (city) resolved.city = city
  return resolved
}
