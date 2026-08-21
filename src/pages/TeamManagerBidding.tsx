import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { PlayerProfileBadges } from '../components/PlayerProfileBadges'
import { AuctionBackground } from '../components/AuctionBackground'
import { TeamAvatar } from '../components/TeamAvatar'
import { SoldCelebration } from '../components/SoldCelebration'
import { useAuction } from '../hooks/useAuction'
import { useBids } from '../hooks/useBids'
import { useBidSound } from '../hooks/useBidSound'
import { useCountdown } from '../hooks/useCountdown'
import { useJustSoldPlayer } from '../hooks/useJustSoldPlayer'
import { useUsers } from '../hooks/useUsers'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../store/authStore'
import { placeBid } from '../lib/auctions'
import { promoteViewerToPlayer } from '../lib/users'

const QUICK_BID_STEPS = [1000, 2000, 5000, 10000]

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
  const currentGroup =
    currentPlayer && auction
      ? currentPlayer.comboId
        ? auction.players.filter((p) => p.comboId === currentPlayer.comboId)
        : [currentPlayer]
      : []
  const bids = useBids(auctionId, auction?.currentPlayerId)
  const remaining = useCountdown(auction?.timerEndsAt ?? null)
  const { sold, clear } = useJustSoldPlayer(auction)
  useBidSound(bids)

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
  const quickBidSteps = QUICK_BID_STEPS
  const isMyBid = currentPlayer?.currentBidder === user.uid
  const mySquad = auction.players
    .filter((p) => p.currentBidder === user.uid && p.status === 'sold')
    .sort((a, b) => b.currentBid - a.currentBid)
  const squadSize = mySquad.length
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
      <AuctionBackground color={auction.bgColor} imageUrl={auction.backgroundImage} />
      <SoldCelebration sold={sold} onDone={clear} />
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1
            className="text-2xl font-semibold text-gray-900 dark:text-gray-100"
            style={{ color: auction.titleColor || undefined }}
          >
            {auction.name} <span className="text-gray-400 font-mono text-lg">#{auction.auctionId}</span>
          </h1>
          <div className="max-w-[70vw] text-right">
            <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
              <TeamAvatar
                teamName={myTeam.name}
                logoId={myTeam.logoId}
                logoImage={myTeam.logoImage}
                jerseyColor={myTeam.jerseyColor}
                size={7}
              />
              <span className="truncate">{myTeam.name} balance</span>
            </div>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {myTeam.remainingTokens}
            </p>
            <p className="text-xs text-gray-500">
              {squadSize} / {myTeam.maxPlayers} players
            </p>
          </div>
        </div>

        {auction.status === 'completed' && (
          <div className="glass-card relative z-[3] flex flex-wrap items-center justify-between gap-3 border-red-300/70! px-4 py-3 dark:border-red-700/60!">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              This auction has ended — bidding is closed.
            </p>
            <Link
              to={`/results/${auction.auctionId}`}
              className="shrink-0 rounded-lg btn-glass border px-3 py-1.5 text-sm font-medium"
            >
              View full results
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="glass-card lg:col-span-2 p-6">
            {!currentPlayer ? (
              <p className="relative z-[3] text-sm text-gray-500">
                {auction.status === 'completed' ? 'The auction has ended.' : 'Waiting for the next player...'}
              </p>
            ) : (
              <div className="relative z-[3] space-y-4">
                <div className="flex items-start justify-between gap-3">
                  {currentGroup.length > 1 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-3">
                        {currentGroup.map((p) => (
                          <Avatar
                            key={p.playerId}
                            name={p.name}
                            encryptedPhoto={p.encryptedPhoto}
                            photoURL={p.photoURL}
                            avatarId={p.avatarId}
                            shape="square"
                            size={28}
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          {currentGroup.map((p) => p.name).join(' + ')}
                        </p>
                        <p className="text-sm text-gray-500">Combo of {currentGroup.length}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <Avatar
                        name={currentPlayer.name}
                        encryptedPhoto={currentPlayer.encryptedPhoto}
                        photoURL={currentPlayer.photoURL}
                        avatarId={currentPlayer.avatarId}
                        shape="square"
                        size={36}
                      />
                      <div className="space-y-1.5">
                        <div>
                          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {currentPlayer.name}
                          </p>
                          <p className="text-sm text-gray-500">{currentPlayer.position}</p>
                        </div>
                        <PlayerProfileBadges
                          battingHandedness={currentPlayer.battingHandedness}
                          bowlingHandedness={currentPlayer.bowlingHandedness}
                          battingType={currentPlayer.battingType}
                          bowlingType={currentPlayer.bowlingType}
                        />
                      </div>
                    </div>
                  )}
                  {remaining !== null && (
                    <span
                      className={`shrink-0 rounded-lg px-3 py-1 font-mono text-2xl font-bold tabular-nums ${
                        remaining <= 5
                          ? 'animate-pulse bg-red-600 text-white'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {remaining}s
                    </span>
                  )}
                </div>

                <div className="rounded-lg surface-inset p-4">
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
                  className="w-full rounded-lg bg-red-600 px-4 py-4 text-lg font-bold text-white shadow-lg shadow-red-600/20 transition-transform duration-100 hover:bg-red-700 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
                >
                  Bid {minBid}
                </button>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {quickBidSteps.map((step, i) => {
                    const amount = minBid + step
                    const disabled = !canBid || placing || amount > myTeam.remainingTokens
                    return (
                      <button
                        key={i}
                        onClick={() => handleBid(amount)}
                        disabled={disabled}
                        title={`Bid ${amount}`}
                        className="input-glass rounded-lg px-2 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition-transform duration-100 hover:bg-white/90 active:scale-[0.96] dark:hover:bg-gray-800/80 disabled:opacity-50 disabled:active:scale-100"
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

          <section className="glass-card p-6">
            <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">Bid history</h2>
            <ul className="relative z-[3] mt-3 space-y-1 text-sm max-h-64 overflow-y-auto">
              {sortedBids.map((b, i) => (
                <li key={i} className="flex justify-between gap-2 text-gray-600 dark:text-gray-400">
                  <span className="truncate">{b.managerName}</span>
                  <span className="shrink-0 font-mono">{b.amount}</span>
                </li>
              ))}
              {sortedBids.length === 0 && <li className="text-gray-500">No bids yet.</li>}
            </ul>
          </section>

          <section className="glass-card lg:col-span-3 p-6">
            <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">
              My squad <span className="text-sm font-normal text-gray-500">({squadSize} / {myTeam.maxPlayers})</span>
            </h2>
            <ul className="relative z-[3] mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {mySquad.map((p) => (
                <li
                  key={p.playerId}
                  className="flex items-center justify-between gap-2 rounded-lg surface-inset px-3 py-2"
                >
                  <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                    {p.name}
                    {p.position && <span className="text-gray-500"> · {p.position}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-gray-600 dark:text-gray-400">{p.currentBid}</span>
                </li>
              ))}
              {mySquad.length === 0 && (
                <li className="text-gray-500">No players won yet.</li>
              )}
            </ul>
          </section>

          <section className="glass-card lg:col-span-3 p-6">
            <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">All teams</h2>
            <div className="relative z-[3] mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...auction.teamManagers]
                .sort((a, b) => b.remainingTokens - a.remainingTokens)
                .map((tm) => {
                  const squad = auction.players
                    .filter((p) => p.currentBidder === tm.managerId && p.status === 'sold')
                    .sort((a, b) => b.currentBid - a.currentBid)
                  return (
                    <div key={tm.managerId} className="rounded-lg surface-inset p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="flex min-w-0 items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                          <TeamAvatar
                            teamName={tm.name}
                            logoId={tm.logoId}
                            logoImage={tm.logoImage}
                            jerseyColor={tm.jerseyColor}
                          />
                          <span className="truncate">{tm.name}</span>
                        </span>
                        <span className="shrink-0 text-gray-500">
                          Balance{' '}
                          <span className="font-mono text-gray-900 dark:text-gray-100">{tm.remainingTokens}</span>
                        </span>
                      </div>
                      {tm.managerName && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">Captain: {tm.managerName}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {squad.length} / {tm.maxPlayers} players
                      </p>
                      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                        {squad.map((p) => (
                          <li key={p.playerId} className="flex justify-between gap-2 text-gray-600 dark:text-gray-400">
                            <span className="min-w-0 truncate">{p.name}</span>
                            <span className="shrink-0 font-mono">{p.currentBid}</span>
                          </li>
                        ))}
                        {squad.length === 0 && <li className="text-gray-500">No players won yet.</li>}
                      </ul>
                    </div>
                  )
                })}
              {auction.teamManagers.length === 0 && (
                <p className="text-sm text-gray-500">No teams added yet.</p>
              )}
            </div>
          </section>

          <section className="glass-card lg:col-span-3 p-6">
            <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">
              Promote a viewer to Player
            </h2>
            <p className="relative z-[3] mt-1 text-sm text-gray-500 dark:text-gray-400">
              Spotted someone in the crowd who should be up for auction? Promote their account so
              the Auction Manager can add them to a roster.
            </p>
            {pendingPlayerRequests.length > 0 && (
              <ul className="relative z-[3] mt-2 space-y-2 text-sm">
                {pendingPlayerRequests.map((v) => (
                  <li
                    key={v.uid}
                    className="glass-card flex flex-col gap-2 border-amber-300/70! px-3 py-2 dark:border-amber-700/60! sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="relative z-[3] flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Avatar
                        name={v.displayName}
                        encryptedPhoto={v.encryptedPhoto}
                        photoURL={v.photoURL}
                        avatarId={v.avatarId}
                      />
                      <span className="min-w-0 break-words">
                        {v.displayName} <span className="text-gray-500">— {v.phone || v.email}</span>
                        <span className="ml-2 rounded-full bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          Requested
                        </span>
                      </span>
                    </span>
                    <button
                      onClick={() => handleApproveRequest(v.uid)}
                      disabled={promoting}
                      className="relative z-[3] self-start rounded-lg btn-glass border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-white/60 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-white/5 sm:self-auto"
                    >
                      Approve
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="relative z-[3] mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={viewerSearch}
                onChange={(e) => {
                  setViewerSearch(e.target.value)
                  setSelectedViewerId('')
                }}
                placeholder="Search viewers by name, email, phone..."
                className="input-glass rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2"
              />
              <button
                onClick={handlePromoteViewer}
                disabled={promoting || !selectedViewerId}
                className="btn-brand rounded-lg px-4 py-2 text-sm font-medium"
              >
                Promote to Player
              </button>
            </div>
            {viewerSearch && !selectedViewerId && (
              <ul className="relative z-[3] mt-2 max-h-40 divide-y divide-gray-200/70 dark:divide-gray-800/70 overflow-y-auto rounded-lg border border-gray-200/80 dark:border-gray-700/80 bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm text-sm">
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
                      <span className="min-w-0 break-words">
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
