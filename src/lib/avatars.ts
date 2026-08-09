export interface DefaultAvatar {
  id: string
  emoji: string
  bg: string
}

// A fixed set of preset avatars for users who'd rather not upload their own
// photo. `id` is what's stored on the user doc (AppUser.avatarId); `bg` is a
// Tailwind class pair so each preset stays visually distinct.
export const DEFAULT_AVATARS: DefaultAvatar[] = [
  { id: 'bat', emoji: '🏏', bg: 'bg-orange-200 dark:bg-orange-900/50' },
  { id: 'trophy', emoji: '🏆', bg: 'bg-yellow-200 dark:bg-yellow-900/50' },
  { id: 'fire', emoji: '🔥', bg: 'bg-red-200 dark:bg-red-900/50' },
  { id: 'star', emoji: '⭐', bg: 'bg-amber-200 dark:bg-amber-900/50' },
  { id: 'lion', emoji: '🦁', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  { id: 'tiger', emoji: '🐯', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  { id: 'eagle', emoji: '🦅', bg: 'bg-blue-200 dark:bg-blue-900/40' },
  { id: 'lightning', emoji: '⚡', bg: 'bg-purple-200 dark:bg-purple-900/40' },
  { id: 'target', emoji: '🎯', bg: 'bg-green-200 dark:bg-green-900/40' },
  { id: 'wave', emoji: '🌊', bg: 'bg-cyan-200 dark:bg-cyan-900/40' },
]

export function getDefaultAvatar(id: string | null | undefined): DefaultAvatar | undefined {
  return id ? DEFAULT_AVATARS.find((a) => a.id === id) : undefined
}
