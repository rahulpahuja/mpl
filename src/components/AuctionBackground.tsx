// Renders an auction's chosen bgColor (see AuctionSetup) as a full-page tint
// behind CricketMotifs' stadium imagery, so each auction can have its own
// look on the pages tied to it (setup, live bidding, viewer feed, results).
export function AuctionBackground({ color }: { color?: string | null }) {
  if (!color) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20"
      style={{ backgroundColor: color }}
    />
  )
}
