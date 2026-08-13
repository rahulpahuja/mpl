import { getDefaultAvatar } from '../lib/avatars'

export function TeamAvatar({
  teamName,
  logoId,
  logoImage,
  size = 8,
}: {
  teamName: string
  logoId?: string | null
  logoImage?: string | null
  size?: number
}) {
  const preset = getDefaultAvatar(logoId)
  const dimension = `${size * 0.25}rem`
  const style = { width: dimension, height: dimension }

  if (logoImage) {
    return (
      <img
        src={logoImage}
        alt=""
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    )
  }

  if (preset) {
    return (
      <div
        style={{ ...style, fontSize: `${size * 0.14}rem` }}
        className={`flex shrink-0 items-center justify-center rounded-full ${preset.bg}`}
      >
        {preset.emoji}
      </div>
    )
  }

  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300"
    >
      {teamName.charAt(0).toUpperCase()}
    </div>
  )
}
