import { useState } from 'react'
import { useDecryptedPhoto } from '../hooks/useDecryptedPhoto'
import { useFilenPhoto } from '../hooks/useFilenPhoto'
import { getDefaultAvatar } from '../lib/avatars'

// Full-size view of a photo, opened by clicking an Avatar rendered with
// enlargeOnClick — see that prop's doc comment on Avatar below.
function PhotoLightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white hover:bg-black/70"
      >
        Close
      </button>
    </div>
  )
}

function AvatarAtSize({
  size,
  className,
  name,
  src,
  preset,
  shapeClass,
  onEnlarge,
}: {
  size: number
  className?: string
  name: string
  src: string | null
  preset: ReturnType<typeof getDefaultAvatar>
  shapeClass: string
  onEnlarge?: () => void
}) {
  const dimension = `${size * 0.25}rem`
  const style = { width: dimension, height: dimension }

  if (src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        style={style}
        onClick={onEnlarge}
        className={`shrink-0 object-cover ${shapeClass} ${className ?? ''} ${onEnlarge ? 'cursor-zoom-in' : ''}`}
      />
    )
  }

  if (preset) {
    return (
      <div
        style={{ ...style, fontSize: `${size * 0.14}rem` }}
        className={`flex shrink-0 items-center justify-center ${shapeClass} ${preset.bg} ${className ?? ''}`}
      >
        {preset.emoji}
      </div>
    )
  }

  return (
    <div
      style={{ ...style, fontSize: `${size * 0.09}rem` }}
      className={`flex shrink-0 items-center justify-center ${shapeClass} bg-gray-200 dark:bg-gray-700 font-medium text-gray-600 dark:text-gray-300 ${className ?? ''}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function Avatar({
  name,
  filenPhotoId,
  encryptedPhoto,
  photoURL,
  avatarId,
  size = 8,
  // Renders a smaller version below the `sm` breakpoint (640px) instead of
  // the full `size` — for the large "current player" spotlight avatars,
  // which otherwise overflow/crowd out the name and badges next to them on
  // a phone screen. Most call sites (list rows, headers) don't need this;
  // omit it and sizing behaves exactly as before.
  mobileSize,
  shape = 'circle',
  // Clicking a real photo (not a preset/initials placeholder — there's
  // nothing to enlarge there) opens it full-size in an overlay. Used on
  // Admin/Auction Manager screens where photos are otherwise shown small
  // (roster rows, the current-player spotlight) and there's a real need to
  // check a face closely — e.g. matching a bidder to who's in the room.
  enlargeOnClick = false,
}: {
  name: string
  filenPhotoId?: string | null
  encryptedPhoto?: string | null
  photoURL?: string | null
  avatarId?: string | null
  size?: number
  mobileSize?: number
  shape?: 'circle' | 'square'
  enlargeOnClick?: boolean
}) {
  const filenPhoto = useFilenPhoto(filenPhotoId)
  const decryptedPhoto = useDecryptedPhoto(encryptedPhoto)
  // Mutually exclusive at the data layer (see lib/users.ts), but guard the
  // display priority anyway: current upload mechanism (Filen) > legacy
  // uploaded photo (pre-Filen accounts that haven't re-uploaded yet) >
  // preset avatar > OAuth photo > initials.
  const src = filenPhoto ?? decryptedPhoto ?? (avatarId ? null : photoURL) ?? null
  const preset = getDefaultAvatar(avatarId)
  const shapeClass = shape === 'square' ? 'rounded-xl' : 'rounded-full'
  const [expanded, setExpanded] = useState(false)
  const onEnlarge = enlargeOnClick && src ? () => setExpanded(true) : undefined

  const lightbox = expanded && src && (
    <PhotoLightbox src={src} name={name} onClose={() => setExpanded(false)} />
  )

  if (mobileSize === undefined) {
    return (
      <>
        <AvatarAtSize size={size} name={name} src={src} preset={preset} shapeClass={shapeClass} onEnlarge={onEnlarge} />
        {lightbox}
      </>
    )
  }

  return (
    <>
      <AvatarAtSize
        size={mobileSize}
        className="sm:hidden"
        name={name}
        src={src}
        preset={preset}
        shapeClass={shapeClass}
        onEnlarge={onEnlarge}
      />
      <AvatarAtSize
        size={size}
        className="hidden sm:flex"
        name={name}
        src={src}
        preset={preset}
        shapeClass={shapeClass}
        onEnlarge={onEnlarge}
      />
      {lightbox}
    </>
  )
}
