import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUsers } from '../hooks/useUsers'
import { clearPhotoRequestOutcome } from '../lib/users'

// Global, mounted once in Layout for Admins/Auction Managers — the "reverse
// notification" back to whoever sent a photo request once the target
// approves or rejects it. Reuses useUsers() (already a live onSnapshot over
// the whole users collection, and already how AdminUsers/AdminPlayers list
// everyone) rather than a second listener — it's cheap at this app's scale
// and keeps this real-time without a dedicated notifications collection.
export function PhotoRequestOutcomeToast() {
  const me = useAuthStore((s) => s.user)
  const { users } = useUsers()
  const [clearingIds, setClearingIds] = useState<Set<string>>(new Set())

  if (!me || (me.role !== 'admin' && me.role !== 'auctionManager')) return null

  const resolved = users.filter(
    (u) =>
      u.uid !== me.uid &&
      u.pendingPhotoRequest &&
      u.pendingPhotoRequest.status !== 'pending' &&
      u.pendingPhotoRequest.requestedBy === me.uid &&
      !clearingIds.has(u.uid),
  )

  if (resolved.length === 0) return null

  async function handleDismiss(uid: string) {
    setClearingIds((prev) => new Set(prev).add(uid))
    try {
      await clearPhotoRequestOutcome(uid)
    } catch {
      setClearingIds((prev) => {
        const next = new Set(prev)
        next.delete(uid)
        return next
      })
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2">
      {resolved.map((u) => {
        const approved = u.pendingPhotoRequest?.status === 'approved'
        return (
          <div
            key={u.uid}
            className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 p-3 shadow-lg"
          >
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {approved ? '✅' : '❌'}{' '}
              <span className="font-medium">{u.displayName}</span>{' '}
              {approved ? 'approved' : 'rejected'} the photo you sent.
            </p>
            <button
              onClick={() => handleDismiss(u.uid)}
              className="mt-1 text-xs text-gray-500 dark:text-gray-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )
      })}
    </div>
  )
}
