import { useVenuesRegistry } from './useVenuesRegistry'
import type { Auction } from '../types'

// Resolves an auction's chosen venue to its first gallery photo (the one
// used as the page backdrop) — see components/AuctionBackground.tsx.
export function useAuctionVenueImage(auction: Auction | null | undefined): string | null {
  const { venues } = useVenuesRegistry()
  if (!auction?.venueId) return null
  return venues.find((v) => v.venueId === auction.venueId)?.images[0] ?? null
}
