import { useDecryptedPhoto } from '../hooks/useDecryptedPhoto'
import { getDefaultAvatar } from '../lib/avatars'

export function Avatar({
  name,
  encryptedPhoto,
  photoURL,
  avatarId,
  size = 8,
  shape = 'circle',
}: {
  name: string
  encryptedPhoto?: string | null
  photoURL?: string | null
  avatarId?: string | null
  size?: number
  shape?: 'circle' | 'square'
}) {
  const decryptedPhoto = useDecryptedPhoto(encryptedPhoto)
  // A chosen preset avatar and the OAuth photo are mutually exclusive at the
  // data layer (see lib/users.ts), but guard the display priority anyway:
  // preset avatar > OAuth photo > initials.
  const src = decryptedPhoto ?? (avatarId ? null : photoURL)
  const preset = getDefaultAvatar(avatarId)

  const dimension = `${size * 0.25}rem`
  const style = { width: dimension, height: dimension }
  const shapeClass = shape === 'square' ? 'rounded-xl' : 'rounded-full'

  if (src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        style={style}
        className={`shrink-0 object-cover ${shapeClass}`}
      />
    )
  }

  if (preset) {
    return (
      <div
        style={{ ...style, fontSize: `${size * 0.14}rem` }}
        className={`flex shrink-0 items-center justify-center ${shapeClass} ${preset.bg}`}
      >
        {preset.emoji}
      </div>
    )
  }

  return (
    <div
      style={{ ...style, fontSize: `${size * 0.09}rem` }}
      className={`flex shrink-0 items-center justify-center ${shapeClass} bg-gray-200 dark:bg-gray-700 font-medium text-gray-600 dark:text-gray-300`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
