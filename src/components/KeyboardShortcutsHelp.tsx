import { NAV_DESTINATIONS } from '../lib/navShortcuts'
import { useAuthStore } from '../store/authStore'

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:text-gray-300">
      {children}
    </kbd>
  )
}

export function KeyboardShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user)

  if (!open || !user) return null

  const destinations = NAV_DESTINATIONS.filter((d) => !d.roles || d.roles.includes(user.role))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Go to</p>
        <ul className="mt-1 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
          {destinations.map((d) => (
            <li key={d.to} className="flex items-center justify-between py-1.5">
              <span className="text-gray-700 dark:text-gray-300">{d.label}</span>
              <span className="flex gap-1">
                {d.chord.split(' ').map((key, i) => (
                  <Kbd key={i}>{key}</Kbd>
                ))}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between py-1.5">
            <span className="text-gray-700 dark:text-gray-300">Show this list</span>
            <Kbd>?</Kbd>
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          Turn shortcuts off anytime from your Profile page.
        </p>
      </div>
    </div>
  )
}
