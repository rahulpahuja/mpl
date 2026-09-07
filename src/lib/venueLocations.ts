// Cascading Country -> State/Province -> City options for the Venues filter.
// A Venue stores a single free-text `location` string (from the Nominatim
// autocomplete, e.g. "Holkar Stadium, Indore, Madhya Pradesh, India"), so the
// filter is a case-insensitive substring match of the most specific selected
// level against that string — no schema change or data migration needed.

export const ANY = 'Any'

export interface CountryLocations {
  country: string
  states: { state: string; cities: string[] }[]
}

export const VENUE_LOCATIONS: CountryLocations[] = [
  {
    country: 'India',
    states: [
      { state: 'Madhya Pradesh', cities: ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain'] },
      { state: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik'] },
      { state: 'Karnataka', cities: ['Bengaluru', 'Mysuru', 'Hubballi'] },
      { state: 'Delhi', cities: ['New Delhi', 'Delhi'] },
      { state: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore'] },
      { state: 'West Bengal', cities: ['Kolkata'] },
      { state: 'Gujarat', cities: ['Ahmedabad', 'Rajkot', 'Surat'] },
      { state: 'Telangana', cities: ['Hyderabad'] },
      { state: 'Rajasthan', cities: ['Jaipur', 'Jodhpur'] },
      { state: 'Punjab', cities: ['Mohali', 'Ludhiana', 'Amritsar'] },
      { state: 'Uttar Pradesh', cities: ['Lucknow', 'Kanpur', 'Noida'] },
    ],
  },
  {
    country: 'Australia',
    states: [
      { state: 'New South Wales', cities: ['Sydney'] },
      { state: 'Victoria', cities: ['Melbourne'] },
      { state: 'Queensland', cities: ['Brisbane'] },
      { state: 'South Australia', cities: ['Adelaide'] },
      { state: 'Western Australia', cities: ['Perth'] },
    ],
  },
  {
    country: 'England',
    states: [
      { state: 'Greater London', cities: ['London'] },
      { state: 'Greater Manchester', cities: ['Manchester'] },
      { state: 'Warwickshire', cities: ['Birmingham'] },
      { state: 'West Yorkshire', cities: ['Leeds'] },
    ],
  },
  {
    country: 'South Africa',
    states: [
      { state: 'Gauteng', cities: ['Johannesburg', 'Pretoria', 'Centurion'] },
      { state: 'Western Cape', cities: ['Cape Town'] },
      { state: 'KwaZulu-Natal', cities: ['Durban'] },
    ],
  },
  {
    country: 'United Arab Emirates',
    states: [
      { state: 'Dubai', cities: ['Dubai'] },
      { state: 'Abu Dhabi', cities: ['Abu Dhabi'] },
      { state: 'Sharjah', cities: ['Sharjah'] },
    ],
  },
]

// The selection the Venues page starts on.
export const DEFAULT_VENUE_FILTER = {
  country: 'India',
  state: 'Madhya Pradesh',
  city: 'Indore',
} as const

export function statesFor(country: string): string[] {
  return VENUE_LOCATIONS.find((c) => c.country === country)?.states.map((s) => s.state) ?? []
}

export function citiesFor(country: string, state: string): string[] {
  return (
    VENUE_LOCATIONS.find((c) => c.country === country)?.states.find((s) => s.state === state)
      ?.cities ?? []
  )
}

// True when `location` matches the most specific level that isn't "Any".
export function locationMatchesFilter(
  location: string,
  filter: { country: string; state: string; city: string },
): boolean {
  const haystack = location.toLowerCase()
  if (filter.city !== ANY) return haystack.includes(filter.city.toLowerCase())
  if (filter.state !== ANY) return haystack.includes(filter.state.toLowerCase())
  if (filter.country !== ANY) return haystack.includes(filter.country.toLowerCase())
  return true
}
