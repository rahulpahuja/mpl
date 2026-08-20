import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAdminClaimed } from '../hooks/useAdminClaimed'
import { useAuctionsByIds } from '../hooks/useAuctionsByIds'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { usePageTitle } from '../hooks/usePageTitle'
import { Layout } from '../components/Layout'
import { createAuction, deleteAuction } from '../lib/auctions'
import { assignUserToAuction, requestToBePlayer } from '../lib/users'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  live: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  completed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export function Home() {
  usePageTitle('Home')
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const adminClaimed = useAdminClaimed()
  const auctions = useAuctionsByIds(user?.assignedAuctions ?? [])
  const { auctions: allAuctions } = useAuctionsList()
  const liveAuctions = allAuctions.filter((a) => a.status === 'live')
  const [newAuctionName, setNewAuctionName] = useState('')
  const [creating, setCreating] = useState(false)
  const [requestingPlayer, setRequestingPlayer] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  async function handleDeleteAuction(auctionId: string, name: string) {
    if (!confirm(`Delete "${name}" (${auctionId})? This permanently removes it and cannot be undone.`)) {
      return
    }
    setDeletingId(auctionId)
    try {
      await deleteAuction(auctionId)
    } finally {
      setDeletingId(null)
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
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/80 dark:bg-red-950/40 backdrop-blur-sm px-4 py-3 text-sm text-red-800 dark:text-red-300">
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
          <div className="glass-card flex flex-wrap gap-2 p-4">
            <input
              value={newAuctionName}
              onChange={(e) => setNewAuctionName(e.target.value)}
              placeholder="New auction name"
              className="input-glass relative z-[3] flex-1 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleCreateAuction}
              disabled={creating || !newAuctionName.trim()}
              className="btn-brand relative z-[3] rounded-lg px-4 py-2 text-sm font-medium"
            >
              Create auction
            </button>
            <Link
              to="/admin/teams"
              className="relative z-[3] rounded-lg btn-glass border px-4 py-2 text-sm font-medium"
            >
              Manage teams
            </Link>
          </div>
        )}

        {user.role === 'viewer' && (
          <div className="glass-card px-4 py-3">
            <p className="relative z-[3] text-sm text-gray-600 dark:text-gray-400">
              Want to be up for auction? Request to become a Player and an Admin, Auction Manager,
              or Captain can approve it.
            </p>
            {user.playerRequested ? (
              <p className="relative z-[3] mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                Request pending approval...
              </p>
            ) : (
              <button
                onClick={handleRequestPlayer}
                disabled={requestingPlayer}
                className="btn-brand relative z-[3] mt-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                Request to become a Player
              </button>
            )}
          </div>
        )}

        {(user.role === 'viewer' || user.role === 'player') && (
          <div>
            {/* A Player also sees their own assigned live auctions highlighted
                below (the green "is live now" banner + assigned-auctions list)
                — skip those here so a player isn't shown the same auction twice. */}
            {(() => {
              const browsableLiveAuctions = liveAuctions.filter(
                (a) => !user.assignedAuctions.includes(a.auctionId),
              )
              return (
                <>
                  <p className="text-gray-500 dark:text-gray-400">
                    {browsableLiveAuctions.length === 0
                      ? 'No other auctions are live right now.'
                      : 'Ongoing auctions you can watch:'}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {browsableLiveAuctions.map((a) => (
                      <li key={a.auctionId}>
                        <Link
                          to={`/viewer/${a.auctionId}`}
                          className="glass-card glass-card-hoverable flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <span className="relative z-[3] truncate font-medium text-gray-900 dark:text-gray-100">
                            {a.name}
                          </span>
                          <span className="relative z-[3] shrink-0 rounded-full bg-green-100/90 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                            live
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )
            })()}
          </div>
        )}

        {user.role !== 'viewer' &&
          user.assignedAuctions
            .map((id) => auctions[id])
            .filter((a) => a?.status === 'live')
            .map((a) => (
              <div
                key={a!.auctionId}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50/80 dark:bg-green-950/40 backdrop-blur-sm px-4 py-3 text-sm text-green-800 dark:text-green-300"
              >
                <span className="min-w-0 flex-1 break-words">
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
                  className="ml-auto shrink-0 font-medium underline"
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
                className="glass-card flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="relative z-[3] flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {auction?.name ?? auctionId}
                  </span>
                  {auction && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[auction.status]}`}
                    >
                      {auction.status}
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-xs text-gray-400">{auctionId}</span>
                </div>
                <span className="relative z-[3] flex flex-wrap gap-x-4 gap-y-1 sm:ml-auto">
                  {user.role === 'auctionManager' && (
                    <>
                      <Link
                        to={`/admin/auctions/${auctionId}/setup`}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        Setup
                      </Link>
                      <Link
                        to={`/manage/${auctionId}`}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        Manage
                      </Link>
                      <Link
                        to={`/viewer/${auctionId}`}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDeleteAuction(auctionId, auction?.name ?? auctionId)}
                        disabled={deletingId === auctionId}
                        className="font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                      >
                        {deletingId === auctionId ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                  {user.role === 'manager' && (
                    <Link
                      to={`/bid/${auctionId}`}
                      className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      Bid
                    </Link>
                  )}
                  {user.role === 'player' && (
                    <Link
                      to={`/viewer/${auctionId}`}
                      className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
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
