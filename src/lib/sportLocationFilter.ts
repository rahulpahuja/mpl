import { ANY } from './venueLocations'
import type { DetectedLocation } from './worldLocations'

// A worldwide Country -> State -> City selection (see lib/worldLocations.ts).
// `countryCode` is the ISO-2 code that keys dataset lookups; `country`,
// `state` and `city` are the canonical dataset names, which is also what
// gets stored on an auction and compared for an exact match. `ANY` at a
// level means "don't filter on it".
export interface LocationValue {
  countryCode: string
  country: string
  state: string
  city: string
}

export const LOCATION_ANY: LocationValue = {
  countryCode: ANY,
  country: ANY,
  state: ANY,
  city: ANY,
}

// The Auctions Directory filter model: a location plus a sport id (or ANY).
export interface SportLocationValue extends LocationValue {
  sport: string
}

export const SPORT_LOCATION_ANY: SportLocationValue = { sport: ANY, ...LOCATION_ANY }

// Cascade transitions — changing a level clears every narrower one, since
// its previous value no longer belongs to the new parent. Pure so the
// wiring is unit-testable without a DOM.
export function withCountry<T extends LocationValue>(value: T, code: string, name: string): T {
  return { ...value, countryCode: code, country: code === ANY ? ANY : name, state: ANY, city: ANY }
}

export function withState<T extends LocationValue>(value: T, state: string): T {
  return { ...value, state, city: ANY }
}

export function withCity<T extends LocationValue>(value: T, city: string): T {
  return { ...value, city }
}

export function withDetected<T extends LocationValue>(value: T, detected: DetectedLocation): T {
  return {
    ...value,
    countryCode: detected.countryCode,
    country: detected.country,
    state: detected.state,
    city: detected.city,
  }
}

// How a location selection is persisted on an Auction: the ISO-2 code (to
// rehydrate the cascade), the canonical names (compared for an exact filter
// match), and a "City, State, Country" display string. Every field is null
// below the deepest level that was actually picked.
export interface AuctionLocationFields {
  locationCountryCode: string | null
  locationCountry: string | null
  locationState: string | null
  locationCity: string | null
  location: string | null
}

export function toAuctionLocation(value: LocationValue): AuctionLocationFields {
  const country = value.country !== ANY ? value.country : null
  const state = value.state !== ANY ? value.state : null
  const city = value.city !== ANY ? value.city : null
  const parts = [city, state, country].filter((p): p is string => !!p)
  return {
    locationCountryCode: value.countryCode !== ANY ? value.countryCode : null,
    locationCountry: country,
    locationState: state,
    locationCity: city,
    location: parts.length > 0 ? parts.join(', ') : null,
  }
}

export function fromAuctionLocation(auction: Partial<AuctionLocationFields>): LocationValue {
  return {
    countryCode: auction.locationCountryCode ?? ANY,
    country: auction.locationCountry ?? ANY,
    state: auction.locationState ?? ANY,
    city: auction.locationCity ?? ANY,
  }
}

// "City, State, Country" for the levels that are set, or a fallback when
// none are.
export function summarizeLocation(value: LocationValue, empty = 'Anywhere'): string {
  const parts = [value.city, value.state, value.country].filter((p) => p !== ANY)
  return parts.length > 0 ? parts.join(', ') : empty
}

// True when an auction's stored location satisfies the filter — exact
// equality on each level that isn't ANY (both sides are canonical dataset
// values). An auction with no stored location only matches an all-ANY filter.
export function auctionMatchesLocation(
  auction: {
    locationCountry?: string | null
    locationState?: string | null
    locationCity?: string | null
  },
  filter: LocationValue,
): boolean {
  if (filter.country !== ANY && auction.locationCountry !== filter.country) return false
  if (filter.state !== ANY && auction.locationState !== filter.state) return false
  if (filter.city !== ANY && auction.locationCity !== filter.city) return false
  return true
}
