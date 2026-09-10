import { create } from 'zustand'
import { type LocationValue, LOCATION_ANY } from '../lib/sportLocationFilter'

// App-wide location context, set from the top-bar location button and read
// by the landing hub to scope what it shows. Sits parallel to the sport
// selector; not persisted, resets to "anywhere" on reload.
interface LocationFilterState {
  location: LocationValue
  setLocation: (location: LocationValue) => void
  clearLocation: () => void
}

export const useLocationFilterStore = create<LocationFilterState>((set) => ({
  location: LOCATION_ANY,
  setLocation: (location) => set({ location }),
  clearLocation: () => set({ location: LOCATION_ANY }),
}))
