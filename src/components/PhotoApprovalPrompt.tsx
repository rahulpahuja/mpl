import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useFilenPhoto } from '../hooks/useFilenPhoto'
import { approvePhotoRequest, rejectPhotoRequest } from '../lib/users'

// Global, mounted once in Layout — real-time for free via the same
// onSnapshot listener AuthProvider already keeps on the signed-in user's
// doc, so this pops up on whatever page the target happens to be on the
// moment an Admin/Auction Manager sends a photo. "Not now" only hides it for
// this page (local state); it reappears on the next navigation since Layout
// remounts per page and the underlying request is still 'pending' in
// Firestore until Approve/Reject actually resolves it.
export function PhotoApprovalPrompt() {
  const user = useAuthStore((s) => s.user)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = user?.pendingPhotoRequest?.status === 'pending' ? user.pendingPhotoRequest : null
  const previewUrl = useFilenPhoto(request?.filenPhotoId)

  if (!user || !request || dismissed) return null

  async function handleApprove() {
    if (!user || !request) return
    setBusy(true)
    setError(null)
    try {
      await approvePhotoRequest(user.uid, request)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve photo')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!user || !request) return
    setBusy(true)
    setError(null)
    try {
      await rejectPhotoRequest(user.uid, request)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject photo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile photo update</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{request.requestedByName}</span> is trying to upload your
          image — see the preview below. If this is your photo, approve it. Otherwise, reject it.
        </p>

        <div className="mt-4 flex justify-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-400">
            {previewUrl ? (
              <img src={previewUrl} alt="Proposed profile photo" className="h-full w-full object-cover" />
            ) : (
              'Loading...'
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={handleReject}
            disabled={busy}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={busy}
            className="btn-brand flex-1 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Approve
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          disabled={busy}
          className="mt-3 w-full text-center text-xs text-gray-400 hover:underline disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
