import { useEffect } from 'react'
import { useBackdropStore } from '../store/backdropStore'

// Renders an auction's chosen backdrop. With no venue photo it's just the
// bgColor tint (see AuctionSetup) behind CricketMotifs' generic stadium
// imagery. With a venue photo, that photo replaces both outright — it's
// shown as-is, full-bleed, with no color tint blended over it and with
// CricketMotifs' generic art hidden (see store/backdropStore.ts) so the
// real venue isn't layered under placeholder stadium art.
export function AuctionBackground({
  color,
  imageUrl,
}: {
  color?: string | null
  imageUrl?: string | null
}) {
  const setVenuePhotoActive = useBackdropStore((s) => s.setVenuePhotoActive)

  useEffect(() => {
    setVenuePhotoActive(!!imageUrl)
    return () => setVenuePhotoActive(false)
  }, [imageUrl, setVenuePhotoActive])

  if (!color && !imageUrl) return null

  if (imageUrl) {
    return (
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20"
      style={{ backgroundColor: color || undefined }}
    />
  )
}
