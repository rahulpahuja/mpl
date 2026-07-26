import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAdminClaimed } from '../hooks/useAdminClaimed'
import { claimFirstAdmin } from '../lib/bootstrap'
import { useAuthStore } from '../store/authStore'

export function BootstrapAdmin() {
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const claimed = useAdminClaimed()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)

  if (initializing || claimed === null) {
    return (
      <Layout>
        <p className="text-gray-500">Loading...</p>
      </Layout>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  async function handleClaim() {
    setError(null)
    setClaiming(true)
    try {
      await claimFirstAdmin(user!.uid)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim admin access')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md p-8 shadow-xl shadow-red-950/5 dark:shadow-black/40 ring-1 ring-black/5">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Set up the first Admin
        </h1>
        {claimed ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            An admin has already been set up for this app. Ask them to promote you from the Admin
            Dashboard's Users section.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No admin has claimed this app yet. Since you're signed in as{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {user.displayName}
              </span>
              , you can become the first Admin. This can only be done once — after this, only an
              existing Admin can promote other users.
            </p>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {claiming ? 'Claiming...' : 'Claim admin access'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>
    </Layout>
  )
}
