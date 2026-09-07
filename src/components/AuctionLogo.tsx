// An auction's emblem. With an uploaded `logoImage` it renders that; without
// one it falls back to a generic brand-gradient gavel badge so every auction
// — including ones conducted before logos existed — still shows a mark.
export function AuctionLogo({
  logoImage,
  size = 12,
  className = '',
}: {
  logoImage?: string | null
  size?: number
  className?: string
}) {
  const dimension = `${size * 0.25}rem`

  if (logoImage) {
    return (
      <img
        src={logoImage}
        alt=""
        style={{ width: dimension, height: dimension }}
        className={`shrink-0 rounded-xl object-cover ${className}`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      style={{ width: dimension, height: dimension }}
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-orange-500 text-white ${className}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: `${size * 0.15}rem` }}>
        gavel
      </span>
    </div>
  )
}
