import { describe, expect, it } from 'vitest'
import { ANY } from './venueLocations'
import { getCities, getCountries, getStates, resolveDetectedLocation } from './worldLocations'
import {
  fromAuctionLocation,
  toAuctionLocation,
  withCity,
  withCountry,
  withDetected,
  withState,
} from './sportLocationFilter'

describe('worldLocations datasets', () => {
  it('exposes every country, sorted by name, with an ISO code', async () => {
    const countries = await getCountries()
    expect(countries.length).toBeGreaterThan(240)
    const names = countries.map((c) => c.name)
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' })
    expect(names).toEqual([...names].sort((a, b) => collator.compare(a, b)))
    expect(countries.find((c) => c.name === 'India')?.code).toBe('IN')
  })

  it('scopes states to a country and cities to a state', async () => {
    const inStates = await getStates('IN')
    expect(inStates).toContain('Maharashtra')
    const cities = await getCities('IN', 'Maharashtra')
    expect(cities).toContain('Mumbai')
  })

  it('returns [] for ANY / empty codes without loading data', async () => {
    expect(await getStates(ANY)).toEqual([])
    expect(await getCities('IN', ANY)).toEqual([])
    expect(await getStates('')).toEqual([])
  })
})

describe('resolveDetectedLocation', () => {
  it('resolves country + state + city from a full address', async () => {
    expect(
      await resolveDetectedLocation({
        country_code: 'in',
        country: 'India',
        state: 'Maharashtra',
        city: 'Mumbai',
      }),
    ).toEqual({ countryCode: 'IN', country: 'India', state: 'Maharashtra', city: 'Mumbai' })
  })

  it('matches the country by name when country_code is absent', async () => {
    const r = await resolveDetectedLocation({
      country: 'india',
      state: 'Karnataka',
      town: 'Bangalore',
    })
    expect(r?.countryCode).toBe('IN')
    expect(r?.state).toBe('Karnataka')
  })

  it('falls back to ANY state/city when the state is unknown', async () => {
    expect(await resolveDetectedLocation({ country_code: 'IN', state: 'Nowhere' })).toEqual({
      countryCode: 'IN',
      country: 'India',
      state: ANY,
      city: ANY,
    })
  })

  it('uses state_district / county as state fallbacks', async () => {
    const r = await resolveDetectedLocation({ country_code: 'IN', county: 'Delhi' })
    expect(r?.state).toBe('Delhi')
  })

  it('returns null for an unknown country', async () => {
    expect(await resolveDetectedLocation({ country: 'Wakanda' })).toBeNull()
  })
})

describe('location cascade helpers', () => {
  const base = { sport: 'cricket', countryCode: ANY, country: ANY, state: ANY, city: ANY }

  it('withCountry sets the code + name and clears narrower levels', () => {
    const v = withState(withCountry(base, 'IN', 'India'), 'Maharashtra')
    expect(withCountry(v, 'AU', 'Australia')).toEqual({
      sport: 'cricket',
      countryCode: 'AU',
      country: 'Australia',
      state: ANY,
      city: ANY,
    })
  })

  it('withCountry(ANY) resets the name to ANY too', () => {
    expect(withCountry(base, ANY, 'ignored').country).toBe(ANY)
  })

  it('withState clears the city; withCity keeps everything else', () => {
    const withCityPicked = withCity(withState(withCountry(base, 'IN', 'India'), 'Goa'), 'Panaji')
    expect(withCityPicked.city).toBe('Panaji')
    expect(withState(withCityPicked, 'Goa').city).toBe(ANY)
  })

  it('withDetected overwrites the whole location, keeps the sport', () => {
    const picked = { ...base, sport: 'football' }
    expect(
      withDetected(picked, { countryCode: 'IN', country: 'India', state: 'Delhi', city: 'Delhi' }),
    ).toEqual({
      sport: 'football',
      countryCode: 'IN',
      country: 'India',
      state: 'Delhi',
      city: 'Delhi',
    })
  })

  it('round-trips through toAuctionLocation / fromAuctionLocation', () => {
    const value = withCity(withState(withCountry(base, 'IN', 'India'), 'Maharashtra'), 'Pune')
    const stored = toAuctionLocation(value)
    expect(stored).toEqual({
      locationCountryCode: 'IN',
      locationCountry: 'India',
      locationState: 'Maharashtra',
      locationCity: 'Pune',
      location: 'Pune, Maharashtra, India',
    })
    expect(fromAuctionLocation(stored)).toEqual({
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      city: 'Pune',
    })
  })

  it('toAuctionLocation nulls every unset level', () => {
    expect(toAuctionLocation({ countryCode: ANY, country: ANY, state: ANY, city: ANY })).toEqual({
      locationCountryCode: null,
      locationCountry: null,
      locationState: null,
      locationCity: null,
      location: null,
    })
  })
})
