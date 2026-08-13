import { useEffect, useState } from 'react'
import { ProfileForm } from './ProfileForm'
import { updateOwnProfile } from '../lib/users'
import { useAuthStore } from '../store/authStore'

function dismissedKey(uid: string) {
  return `profileSetupDismissed:${uid}`
}

export function ProfileSetupModal() {
  const user = useAuthStore((s) => s.user)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(false)
  }, [user?.uid])

  if (!user) return null
  if (dismissed) return null
  if (user.phone || user.whatsapp || user.location) return null
  if (sessionStorage.getItem(dismissedKey(user.uid))) return null

  function dismiss() {
    if (user) sessionStorage.setItem(dismissedKey(user.uid), '1')
    setDismissed(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-md max-h-full overflow-y-auto rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Complete your profile
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add a few contact details so organizers can reach you. You can always update this later
          from your profile.
        </p>
        <div className="mt-4">
          <ProfileForm
            initial={{ displayName: user.displayName, phone: '', whatsapp: '', location: '' }}
            submitLabel="Save and continue"
            onSave={async (fields) => {
              await updateOwnProfile(user.uid, fields)
              setDismissed(true)
            }}
          />
        </div>
        <button
          onClick={dismiss}
          className="mt-3 text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
