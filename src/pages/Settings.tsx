import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePageTitle } from '../hooks/usePageTitle'
import { Layout } from '../components/Layout'

type SettingsItem = { to: string; label: string; description: string }

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    to: '/settings/filen-test',
    label: 'Filen Test',
    description: 'Check the Filen / Render proxy connectivity and run a test upload.',
  },
]

export function Settings() {
  usePageTitle('Settings')
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/home" replace />

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Admin tools and diagnostics.</p>
        </div>
        <ul className="space-y-2.5 text-sm">
          {SETTINGS_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="glass-card glass-card-hoverable flex flex-col gap-1 px-4 py-3"
              >
                <span className="relative z-[3] font-medium text-gray-900 dark:text-gray-100">
                  {item.label}
                </span>
                <span className="relative z-[3] text-gray-500 dark:text-gray-400">
                  {item.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}
