import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAdminClaimed } from '../hooks/useAdminClaimed'
import { useAuctionsByIds } from '../hooks/useAuctionsByIds'
import { Layout } from '../components/Layout'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  live: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  completed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export function Home() {
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const adminClaimed = useAdminClaimed()
  const auctions = useAuctionsByIds(user?.assignedAuctions ?? [])

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
          {user.assignedAuctions.map((auctionId) => {
            const auction = auctions[auctionId]
            return (
              <li
                key={auctionId}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm px-4 py-3"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {auction?.name ?? auctionId}
                </span>
                {auction && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[auction.status]}`}
                  >
                    {auction.status}
                  </span>
                )}
                <span className="font-mono text-xs text-gray-400">{auctionId}</span>
                <span className="ml-auto flex gap-3">
                  {user.role === 'auctionManager' && (
                    <>
                      <Link
                        to={`/admin/auctions/${auctionId}/setup`}
                        className="text-red-600 dark:text-red-400 hover:underline"
                      >
                        Setup
                      </Link>
                      <Link
                        to={`/manage/${auctionId}`}
                        className="text-red-600 dark:text-red-400 hover:underline"
                      >
                        Manage
                      </Link>
                    </>
                  )}
                  {user.role === 'manager' && (
                    <Link
                      to={`/bid/${auctionId}`}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Bid
                    </Link>
                  )}
                  {user.role === 'player' && (
                    <Link
                      to={`/viewer/${auctionId}`}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Watch
                    </Link>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Layout>
  )
}
