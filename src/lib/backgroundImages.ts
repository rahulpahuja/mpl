// Sample ground photos an Auction Manager can pick as an auction's page
// backdrop (see AuctionSetup and components/AuctionBackground.tsx). Static
// assets bundled with the app rather than user-uploaded, so no Firestore
// round-trip is needed to resolve a selection — the auction doc just stores
// one of these `path` values directly in `backgroundImage`.
export interface BackgroundImageOption {
  id: string
  label: string
  path: string
}

export const BACKGROUND_IMAGES: BackgroundImageOption[] = [
  { id: 'ground-1', label: 'Ground 1', path: '/backgrounds/ground-1.jpg' },
  { id: 'ground-2', label: 'Ground 2', path: '/backgrounds/ground-2.jpg' },
  { id: 'ground-3', label: 'Ground 3', path: '/backgrounds/ground-3.jpg' },
  { id: 'ground-4', label: 'Ground 4', path: '/backgrounds/ground-4.jpg' },
  { id: 'ground-5', label: 'Ground 5', path: '/backgrounds/ground-5.jpg' },
  { id: 'ground-6', label: 'Ground 6', path: '/backgrounds/ground-6.jpg' },
  { id: 'ground-7', label: 'Ground 7', path: '/backgrounds/ground-7.jpg' },
  { id: 'ground-8', label: 'Ground 8', path: '/backgrounds/ground-8.jpg' },
  { id: 'ground-9', label: 'Ground 9', path: '/backgrounds/ground-9.jpg' },
]
