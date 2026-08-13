import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AuctionHistory } from '../components/AuctionHistory'
import { ProfileForm } from '../components/ProfileForm'
import { ProfilePhotoUpload } from '../components/ProfilePhotoUpload'
import { useKeyboardShortcutsEnabled } from '../hooks/useKeyboardShortcutsEnabled'
import { usePageTitle } from '../hooks/usePageTitle'
import { ensureUserCode } from '../lib/auth'
import { updateOwnProfile } from '../lib/users'
import { useAuthStore } from '../store/authStore'

export function Profile() {
  usePageTitle('Your Profile')
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const [shortcutsEnabled, setShortcutsEnabled] = useKeyboardShortcutsEnabled()

  // Accounts created before the userCode feature shipped won't have one —
  // assign it lazily here instead of requiring the admin backfill script.
  // The Firestore doc update flows back through AuthProvider's onSnapshot
  // listener, so `user.userCode` updates on its own once this resolves.
  useEffect(() => {
    if (user && !user.userCode) {
      ensureUserCode(user.uid).catch((err) => console.error('Failed to assign user code', err))
    }
  }, [user])

  if (initializing) {
    return (
      <Layout>
        <p className="text-gray-500">Loading...</p>
      </Layout>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <Layout>
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md p-8 shadow-xl shadow-red-950/5 dark:shadow-black/40 ring-1 ring-black/5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user.displayName} · {user.email}
          </p>
          {user.userCode && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Your ID: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{user.userCode}</span>{' '}
              — share this with whoever's setting up a team so they can add you as its manager.
            </p>
          )}
        </div>
        <ProfilePhotoUpload uid={user.uid} encryptedPhoto={user.encryptedPhoto} avatarId={user.avatarId} />
        <ProfileForm
          initial={{
            phone: user.phone ?? '',
            whatsapp: user.whatsapp ?? '',
            location: user.location ?? '',
            battingHandedness: user.battingHandedness,
            bowlingHandedness: user.bowlingHandedness,
            playingRole: user.playingRole,
            battingType: user.battingType,
            bowlingType: user.bowlingType,
            jerseyNumber: user.jerseyNumber ?? undefined,
          }}
          onSave={(fields) => updateOwnProfile(user.uid, fields)}
        />
        <AuctionHistory role={user.role} assignedAuctions={user.assignedAuctions} />

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={shortcutsEnabled}
              onChange={(e) => setShortcutsEnabled(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700 text-red-600 focus:ring-red-500"
            />
            Enable keyboard shortcuts
          </label>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Press{' '}
            <kbd className="rounded border border-gray-300 dark:border-gray-700 px-1 font-mono">?</kbd>{' '}
            anywhere to see the full list.
          </p>
        </div>
      </div>
    </Layout>
  )
}
