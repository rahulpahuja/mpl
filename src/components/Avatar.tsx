import { useDecryptedPhoto } from '../hooks/useDecryptedPhoto'

export function Avatar({
  name,
  encryptedPhoto,
  photoURL,
  size = 8,
}: {
  name: string
  encryptedPhoto?: string | null
  photoURL?: string | null
  size?: number
}) {
  const decryptedPhoto = useDecryptedPhoto(encryptedPhoto)
  const src = decryptedPhoto ?? photoURL

  const dimension = `${size * 0.25}rem`
  const style = { width: dimension, height: dimension }

  if (src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
