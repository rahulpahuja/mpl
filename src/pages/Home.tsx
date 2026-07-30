import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAdminClaimed } from '../hooks/useAdminClaimed'
import { useAuctionsByIds } from '../hooks/useAuctionsByIds'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { Layout } from '../components/Layout'
import { createAuction } from '../lib/auctions'
import { assignUserToAuction, requestToBePlayer } from '../lib/users'

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
  const { auctions: allAuctions } = useAuctionsList()
  const liveAuctions = allAuctions.filter((a) => a.status === 'live')
  const [newAuctionName, setNewAuctionName] = useState('')
  const [creating, setCreating] = useState(false)
  const [requestingPlayer, setRequestingPlayer] = useState(false)

  async function handleCreateAuction() {
    if (!newAuctionName.trim() || !user) return
    setCreating(true)
    try {
      const auctionId = await createAuction(newAuctionName.trim(), user.uid)
      await assignUserToAuction(user.uid, auctionId, user.assignedAuctions, user.role)
      setNewAuctionName('')
    } finally {
      setCreating(false)
    }
  }

  async function handleRequestPlayer() {
    if (!user) return
    setRequestingPlayer(true)
    try {
      await requestToBePlayer(user.uid)
    } finally {
      setRequestingPlayer(false)
    }
  }

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

        {user.role === 'auctionManager' && (
          <div className="flex gap-2">
            <input
              value={newAuctionName}
              onChange={(e) => setNewAuctionName(e.target.value)}
              placeholder="New auction name"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={handleCreateAuction}
              disabled={creating || !newAuctionName.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Create auction
            </button>
          </div>
        )}

        {user.role === 'viewer' && (
          <div className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm px-4 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Want to be up for auction? Request to become a Player and an Admin, Auction Manager,
              or Team Manager can approve it.
            </p>
            {user.playerRequested ? (
              <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                Request pending approval...
              </p>
            ) : (
              <button
                onClick={handleRequestPlayer}
                disabled={requestingPlayer}
                className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Request to become a Player
              </button>
            )}
          </div>
        )}

        {user.role === 'viewer' && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">
              {liveAuctions.length === 0
                ? 'No auctions are live right now.'
                : 'Ongoing auctions you can watch:'}
            </p>
            <ul className="mt-2 space-y-2">
              {liveAuctions.map((a) => (
                <li key={a.auctionId}>
                  <Link
                    to={`/viewer/${a.auctionId}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">{a.name}</span>
                    <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                      live
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {user.role !== 'viewer' &&
          user.assignedAuctions
            .map((id) => auctions[id])
            .filter((a) => a?.status === 'live')
            .map((a) => (
              <div
                key={a!.auctionId}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm text-green-800 dark:text-green-300"
              >
                <span>
                  <span className="font-medium">{a!.name}</span> is live now — time to take part.
                </span>
                <Link
                  to={
                    user.role === 'auctionManager'
                      ? `/manage/${a!.auctionId}`
                      : user.role === 'manager'
                        ? `/bid/${a!.auctionId}`
                        : `/viewer/${a!.auctionId}`
                  }
                  className="ml-auto font-medium underline"
                >
                  {user.role === 'auctionManager' ? 'Manage' : user.role === 'manager' ? 'Bid now' : 'Watch'}
                </Link>
              </div>
            ))}

        {user.role !== 'viewer' && (
          <>
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
          </>
        )}
      </div>
    </Layout>
  )
}
