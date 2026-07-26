import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAdminClaimed } from '../hooks/useAdminClaimed'
import { Layout } from '../components/Layout'

export function Home() {
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const adminClaimed = useAdminClaimed()

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <Layout>
      <div className="space-y-4">
        {adminClaimed === false && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
            No admin has been set up for this app yet.{' '}
            <Link to="/bootstrap-admin" className="font-medium underline">
              Claim admin access
            </Link>
          </div>
        )}
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Welcome, {user.displayName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {user.assignedAuctions.length === 0
            ? "You haven't been assigned to an auction yet."
            : 'Your assigned auctions:'}
        </p>
        <ul className="space-y-2">
          {user.assignedAuctions.map((auctionId) => (
            <li key={auctionId}>
              <a
                href={user.role === 'auctionManager' ? `/manage/${auctionId}` : `/bid/${auctionId}`}
                className="text-red-600 dark:text-red-400 hover:underline"
              >
                {auctionId}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}
