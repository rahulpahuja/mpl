import { useDecryptedPhoto } from '../hooks/useDecryptedPhoto'
import { useFilenPhoto } from '../hooks/useFilenPhoto'
import { getDefaultAvatar } from '../lib/avatars'

function AvatarAtSize({
  size,
  className,
  name,
  src,
  preset,
  shapeClass,
}: {
  size: number
  className?: string
  name: string
  src: string | null
  preset: ReturnType<typeof getDefaultAvatar>
  shapeClass: string
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
        className={`shrink-0 object-cover ${shapeClass} ${className ?? ''}`}
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
}: {
  name: string
  filenPhotoId?: string | null
  encryptedPhoto?: string | null
  photoURL?: string | null
  avatarId?: string | null
  size?: number
  mobileSize?: number
  shape?: 'circle' | 'square'
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

  if (mobileSize === undefined) {
    return <AvatarAtSize size={size} name={name} src={src} preset={preset} shapeClass={shapeClass} />
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
      />
      <AvatarAtSize
        size={size}
        className="hidden sm:flex"
        name={name}
        src={src}
        preset={preset}
        shapeClass={shapeClass}
      />
    </>
  )
}
