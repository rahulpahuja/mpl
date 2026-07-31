import { Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ProfileForm } from '../components/ProfileForm'
import { usePageTitle } from '../hooks/usePageTitle'
import { updateOwnProfile } from '../lib/users'
import { useAuthStore } from '../store/authStore'

export function Profile() {
  usePageTitle('Your Profile')
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)

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
        </div>
        <ProfileForm
          initial={{
            phone: user.phone ?? '',
            whatsapp: user.whatsapp ?? '',
            location: user.location ?? '',
          }}
          onSave={(fields) => updateOwnProfile(user.uid, fields)}
        />
      </div>
    </Layout>
  )
}
