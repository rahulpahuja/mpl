import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { TeamAvatar } from '../components/TeamAvatar'
import { useAuction } from '../hooks/useAuction'
import { useBids } from '../hooks/useBids'
import { useCountdown } from '../hooks/useCountdown'
import { useUsers } from '../hooks/useUsers'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../store/authStore'
import { placeBid } from '../lib/auctions'
import { promoteViewerToPlayer } from '../lib/users'

const QUICK_BID_STEPS = [50, 100, 200, 500, 1000, 10000]

export function TeamManagerBidding() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  usePageTitle(auction ? `${auction.name} · Bid` : 'Bid')
  const user = useAuthStore((s) => s.user)
  const [error, setError] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const { users } = useUsers()
  const [viewerSearch, setViewerSearch] = useState('')
  const [selectedViewerId, setSelectedViewerId] = useState('')
  const [promoting, setPromoting] = useState(false)

  const currentPlayer = auction?.players.find((p) => p.playerId === auction.currentPlayerId) ?? null
  const bids = useBids(auctionId, auction?.currentPlayerId)
  const remaining = useCountdown(auction?.timerEndsAt ?? null)

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-500">Loading...</p>
      </Layout>
    )
  }

  if (!auction || !auctionId || !user) {
    return (
      <Layout>
        <p className="text-gray-500">Auction not found.</p>
      </Layout>
    )
  }

  const myTeam = auction.teamManagers.find((tm) => tm.managerId === user.uid)

  const viewerCandidates = users
    .filter((u) => u.role === 'viewer')
    .filter((u) => {
      const q = viewerSearch.trim().toLowerCase()
      if (!q) return true
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    })
    .sort((a, b) => Number(b.playerRequested) - Number(a.playerRequested))
  const pendingPlayerRequests = users.filter((u) => u.role === 'viewer' && u.playerRequested)

  async function handlePromoteViewer() {
    if (!selectedViewerId) return
    setPromoting(true)
    try {
      await promoteViewerToPlayer(selectedViewerId)
      setSelectedViewerId('')
      setViewerSearch('')
    } finally {
      setPromoting(false)
    }
  }

  async function handleApproveRequest(uid: string) {
    setPromoting(true)
    try {
      await promoteViewerToPlayer(uid)
    } finally {
      setPromoting(false)
    }
  }

  if (!myTeam) {
    return (
      <Layout>
        <p className="text-gray-500">
          You aren't registered as a team manager for this auction yet.
        </p>
      </Layout>
    )
  }

  const minBid = currentPlayer
    ? currentPlayer.currentBid > 0
      ? currentPlayer.currentBid + auction.bidIncrement
      : currentPlayer.basePrice
    : 0
  const isMyBid = currentPlayer?.currentBidder === user.uid
  const squadSize = auction.players.filter(
    (p) => p.currentBidder === user.uid && p.status === 'sold',
  ).length
  const squadFull = squadSize >= myTeam.maxPlayers
  const canBid =
    !!currentPlayer &&
    !isMyBid &&
    !squadFull &&
    myTeam.remainingTokens >= minBid &&
    auction.status === 'live'

  async function handleBid(amount: number) {
    if (!currentPlayer || !auctionId) return
    setError(null)
    setPlacing(true)
    try {
      await placeBid(auctionId, currentPlayer.playerId, user!.uid, myTeam!.name, amount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bid failed')
    } finally {
      setPlacing(false)
    }
  }

  const sortedBids = [...(bids?.bids ?? [])].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {auction.name} <span className="text-gray-400 font-mono text-lg">#{auction.auctionId}</span>
          </h1>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
              <TeamAvatar teamName={myTeam.name} logoId={myTeam.logoId} size={5} />
              {myTeam.name} balance
            </div>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {myTeam.remainingTokens}
            </p>
            <p className="text-xs text-gray-500">
              {squadSize} / {myTeam.maxPlayers} players
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
            {!currentPlayer ? (
              <p className="text-sm text-gray-500">Waiting for the next player...</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {currentPlayer.name}
                    </p>
                    <p className="text-sm text-gray-500">{currentPlayer.position}</p>
                  </div>
                  {remaining !== null && (
                    <span className="text-2xl font-mono text-gray-900 dark:text-gray-100">
                      {remaining}s
                    </span>
                  )}
                </div>

                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="text-sm text-gray-500">Current bid</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {currentPlayer.currentBid || currentPlayer.basePrice}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isMyBid ? 'You are the highest bidder' : currentPlayer.currentBidderName ?? 'No bids yet'}
                  </p>
                </div>

                <button
                  onClick={() => handleBid(minBid)}
                  disabled={!canBid || placing}
                  className="w-full rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Bid {minBid}
                </button>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {QUICK_BID_STEPS.map((step) => {
                    const amount = minBid + step
                    const disabled = !canBid || placing || amount > myTeam.remainingTokens
                    return (
                      <button
                        key={step}
                        onClick={() => handleBid(amount)}
                        disabled={disabled}
                        title={`Bid ${amount}`}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        +{step}
                      </button>
                    )
                  })}
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!canBid && !isMyBid && squadFull && (
                  <p className="text-sm text-amber-600">
                    Your squad is full ({myTeam.maxPlayers} players).
                  </p>
                )}
                {!canBid && !isMyBid && !squadFull && myTeam.remainingTokens < minBid && (
                  <p className="text-sm text-amber-600">Insufficient tokens for the next bid.</p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Bid history</h2>
            <ul className="mt-3 space-y-1 text-sm max-h-64 overflow-y-auto">
              {sortedBids.map((b, i) => (
                <li key={i} className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{b.managerName}</span>
                  <span className="font-mono">{b.amount}</span>
                </li>
              ))}
              {sortedBids.length === 0 && <li className="text-gray-500">No bids yet.</li>}
            </ul>
          </section>

          <section className="lg:col-span-3 rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Promote a viewer to Player
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Spotted someone in the crowd who should be up for auction? Promote their account so
              the Auction Manager can add them to a roster.
            </p>
            {pendingPlayerRequests.length > 0 && (
              <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-amber-300 dark:border-amber-700 text-sm">
                {pendingPlayerRequests.map((v) => (
                  <li key={v.uid} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Avatar
                        name={v.displayName}
                        encryptedPhoto={v.encryptedPhoto}
                        photoURL={v.photoURL}
                        avatarId={v.avatarId}
                      />
                      <span>
                        {v.displayName} <span className="text-gray-500">— {v.phone || v.email}</span>
                        <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          Requested
                        </span>
                      </span>
                    </span>
                    <button
                      onClick={() => handleApproveRequest(v.uid)}
                      disabled={promoting}
                      className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={viewerSearch}
                onChange={(e) => {
                  setViewerSearch(e.target.value)
                  setSelectedViewerId('')
                }}
                placeholder="Search viewers by name, email, phone..."
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2"
              />
              <button
                onClick={handlePromoteViewer}
                disabled={promoting || !selectedViewerId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Promote to Player
              </button>
            </div>
            {viewerSearch && !selectedViewerId && (
              <ul className="mt-2 max-h-40 divide-y divide-gray-200 dark:divide-gray-800 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                {viewerCandidates.map((v) => (
                  <li key={v.uid}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedViewerId(v.uid)
                        setViewerSearch(`${v.displayName} (${v.phone || v.email})`)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Avatar
                        name={v.displayName}
                        encryptedPhoto={v.encryptedPhoto}
                        photoURL={v.photoURL}
                        avatarId={v.avatarId}
                      />
                      <span>
                        {v.displayName} <span className="text-gray-500">— {v.phone || v.email}</span>
                        {v.playerRequested && (
                          <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            Requested
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
                {viewerCandidates.length === 0 && (
                  <li className="px-3 py-2 text-gray-500">No "Viewer" users match.</li>
                )}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Layout>
  )
}
