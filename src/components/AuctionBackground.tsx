// Renders an auction's chosen backdrop behind CricketMotifs' stadium
// imagery, so each auction can have its own look on the pages tied to it
// (setup, live bidding, viewer feed, results). With no venue photo it's
// just the bgColor tint (see AuctionSetup); with one, the photo fills the
// backdrop and bgColor becomes a tint over it so title/body text set via
// titleColor/secondaryColor stays readable against any photo.
export function AuctionBackground({
  color,
  imageUrl,
}: {
  color?: string | null
  imageUrl?: string | null
}) {
  if (!color && !imageUrl) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: color || undefined, opacity: imageUrl ? 0.6 : 1 }}
      />
    </div>
  )
}
