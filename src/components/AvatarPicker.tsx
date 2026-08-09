import { DEFAULT_AVATARS } from '../lib/avatars'

export function AvatarPicker({
  selectedId,
  onSelect,
  disabled,
}: {
  selectedId?: string | null
  onSelect: (id: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DEFAULT_AVATARS.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id)}
          disabled={disabled}
          aria-label={`Use ${a.id} avatar`}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg disabled:opacity-50 ${a.bg} ${
            selectedId === a.id
              ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
              : ''
          }`}
        >
          {a.emoji}
        </button>
      ))}
    </div>
  )
}
