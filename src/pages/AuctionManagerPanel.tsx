import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { TeamAvatar } from '../components/TeamAvatar'
import { useAuction } from '../hooks/useAuction'
import { useBids } from '../hooks/useBids'
import { useCountdown } from '../hooks/useCountdown'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  assignUnsoldPlayer,
  markSold,
  markUnsold,
  setCurrentPlayer,
  startTimer,
  stopTimer,
  updateAuctionStatus,
} from '../lib/auctions'

export function AuctionManagerPanel() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  usePageTitle(auction ? `${auction.name} · Manage` : 'Manage auction')
  const [timerDuration, setTimerDuration] = useState('30')
  const [busy, setBusy] = useState(false)
  const [assignTeamByPlayer, setAssignTeamByPlayer] = useState<Record<string, string>>({})

  // Re-sync only when landing on a (possibly different) auction, not on every live update.
  useEffect(() => {
    if (auction) setTimerDuration(String(auction.timerDurationSeconds))
  }, [auction?.auctionId])

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

  if (!auction || !auctionId) {
    return (
      <Layout>
        <p className="text-gray-500">Auction not found.</p>
      </Layout>
    )
  }

  const queue = auction.players.filter((p) => p.status === 'open')
  const unsold = auction.players.filter((p) => p.status === 'unsold')
  const sortedBids = [...(bids?.bids ?? [])].sort((a, b) => b.timestamp - a.timestamp)
  const wallets = [...auction.teamManagers].sort((a, b) => b.remainingTokens - a.remainingTokens)

  async function handleAssign(playerId: string) {
    const teamId = assignTeamByPlayer[playerId]
    if (!teamId || !auctionId) return
    await run(() => assignUnsoldPlayer(auctionId, playerId, teamId))
    setAssignTeamByPlayer((prev) => ({ ...prev, [playerId]: '' }))
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {auction.name} <span className="text-gray-400 font-mono text-lg">#{auction.auctionId}</span>
            </h1>
            <p className="text-sm text-gray-500">Status: {auction.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/results/${auction.auctionId}`}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              View results
            </Link>
            {auction.status === 'live' && (
              <button
                onClick={() => run(() => updateAuctionStatus(auctionId, 'completed'))}
                disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                End auction
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Current player</h2>
            {!currentPlayer ? (
              <p className="mt-3 text-sm text-gray-500">No player is currently on the block.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {currentPlayer.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentPlayer.position} · Base price {currentPlayer.basePrice}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="text-sm text-gray-500">Current bid</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {currentPlayer.currentBid || currentPlayer.basePrice}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentPlayer.currentBidderName ?? 'No bids yet'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {remaining === null ? (
                    <>
                      <input
                        type="number"
                        value={timerDuration}
                        onChange={(e) => setTimerDuration(e.target.value)}
                        className="w-20 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={() => run(() => startTimer(auctionId, Number(timerDuration) || 30))}
                        disabled={busy}
                        className="rounded-lg bg-gray-800 dark:bg-gray-200 px-3 py-1.5 text-sm font-medium text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
                      >
                        Start timer
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-mono text-gray-900 dark:text-gray-100">
                        {remaining}s
                      </span>
                      <button
                        onClick={() => run(() => stopTimer(auctionId))}
                        disabled={busy}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        Stop
                      </button>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => run(() => markSold(auctionId, currentPlayer.playerId))}
                    disabled={busy || !currentPlayer.currentBidder}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark sold
                  </button>
                  <button
                    onClick={() => run(() => markUnsold(auctionId, currentPlayer.playerId))}
                    disabled={busy}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    Mark unsold
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bid history</h3>
                  <ul className="mt-2 space-y-1 text-sm max-h-48 overflow-y-auto">
                    {sortedBids.map((b, i) => (
                      <li key={i} className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>{b.managerName}</span>
                        <span className="font-mono">{b.amount}</span>
                      </li>
                    ))}
                    {sortedBids.length === 0 && <li className="text-gray-500">No bids yet.</li>}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Next up</h2>
            <ul className="mt-3 space-y-2">
              {queue.map((p) => (
                <li
                  key={p.playerId}
                  className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <span className="text-gray-900 dark:text-gray-100">{p.name}</span>
                  <button
                    onClick={() => run(() => setCurrentPlayer(auctionId, p.playerId))}
                    disabled={busy || !!currentPlayer}
                    className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    Start
                  </button>
                </li>
              ))}
              {queue.length === 0 && <li className="text-sm text-gray-500">Queue is empty.</li>}
            </ul>
          </section>
        </div>

        <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Team wallets</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {wallets.map((tm) => (
              <li
                key={tm.managerId}
                className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <TeamAvatar teamName={tm.name} logoId={tm.logoId} />
                  {tm.name}
                </span>
                <span className="text-gray-500">
                  Balance <span className="font-mono text-gray-900 dark:text-gray-100">{tm.remainingTokens}</span>
                </span>
              </li>
            ))}
            {wallets.length === 0 && <li className="text-sm text-gray-500">No teams added yet.</li>}
          </ul>
        </section>

        {unsold.length > 0 && (
          <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Unsold players</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Assign a leftover player directly to a team at base price — useful for clearing the
              unsold list before ending the auction.
            </p>
            <ul className="mt-3 space-y-2">
              {unsold.map((p) => (
                <li
                  key={p.playerId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <span className="text-gray-900 dark:text-gray-100">
                    {p.name} <span className="text-gray-500">({p.position}) · Base {p.basePrice}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={assignTeamByPlayer[p.playerId] ?? ''}
                      onChange={(e) =>
                        setAssignTeamByPlayer((prev) => ({ ...prev, [p.playerId]: e.target.value }))
                      }
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Assign to team...</option>
                      {auction.teamManagers.map((tm) => (
                        <option key={tm.teamId} value={tm.teamId}>
                          {tm.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssign(p.playerId)}
                      disabled={busy || !assignTeamByPlayer[p.playerId]}
                      className="rounded-md bg-gray-800 dark:bg-gray-200 px-3 py-1 text-xs font-medium text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  )
}
