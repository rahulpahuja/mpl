import { create } from 'zustand'

// Lets AuctionBackground (rendered per auction page) tell the app-wide
// CricketMotifs (rendered once in App.tsx) to stand down — a venue photo
// replaces the generic stadium art entirely rather than layering under it.
interface BackdropState {
  venuePhotoActive: boolean
  setVenuePhotoActive: (active: boolean) => void
}

export const useBackdropStore = create<BackdropState>((set) => ({
  venuePhotoActive: false,
  setVenuePhotoActive: (active) => set({ venuePhotoActive: active }),
}))
