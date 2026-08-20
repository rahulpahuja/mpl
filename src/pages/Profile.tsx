import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AuctionHistory } from '../components/AuctionHistory'
import { CareerStats } from '../components/CareerStats'
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
      <div className="glass-card mx-auto max-w-md p-8 lg:max-w-3xl">
      <div className="relative z-[3] space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <ProfilePhotoUpload
            uid={user.uid}
            filenPhotoId={user.filenPhotoId}
            encryptedPhoto={user.encryptedPhoto}
            avatarId={user.avatarId}
          />
        </div>
        <ProfileForm
          initial={{
            displayName: user.displayName,
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
        <CareerStats playerId={user.uid} />

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={shortcutsEnabled}
              onChange={(e) => setShortcutsEnabled(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700 text-orange-600 focus:ring-orange-500"
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
      </div>
    </Layout>
  )
}
