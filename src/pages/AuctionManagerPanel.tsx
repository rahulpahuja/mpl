import { useEffect, useState } from 'react'
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
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../store/authStore'
import {
  assignUnsoldPlayer,
  breakCombo,
  createCombo,
  markSold,
  markUnsold,
  restartAuction,
  returnPlayerToQueue,
  revertSale,
  setCurrentPlayer,
  startTimer,
  stopTimer,
  updateAuctionStatus,
} from '../lib/auctions'
import type { Player } from '../types'

// Groups players sharing a comboId (see the Player type doc comment) into
// one row for list rendering, in stable list order. Standalone players (no
// comboId) come back as a singleton group.
function groupByCombo(players: Player[]): Player[][] {
  const seen = new Set<string>()
  const groups: Player[][] = []
  for (const p of players) {
    if (seen.has(p.playerId)) continue
    const group = p.comboId ? players.filter((q) => q.comboId === p.comboId) : [p]
    group.forEach((q) => seen.add(q.playerId))
    groups.push(group)
  }
  return groups
}

export function AuctionManagerPanel() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  const user = useAuthStore((s) => s.user)
  usePageTitle(auction ? `${auction.name} · Manage` : 'Manage auction')
  const [timerDuration, setTimerDuration] = useState('30')
  const [busy, setBusy] = useState(false)
  const [assignTeamByPlayer, setAssignTeamByPlayer] = useState<Record<string, string>>({})
  const [assignAmountByPlayer, setAssignAmountByPlayer] = useState<Record<string, string>>({})
  const [comboSelection, setComboSelection] = useState<Set<string>>(new Set())

  // Re-sync only when landing on a (possibly different) auction, not on every live update.
  useEffect(() => {
    if (auction) setTimerDuration(String(auction.timerDurationSeconds))
  }, [auction?.auctionId])

  const currentPlayer = auction?.players.find((p) => p.playerId === auction.currentPlayerId) ?? null
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

  if (!auction || !auctionId) {
    return (
      <Layout>
        <p className="text-gray-500">Auction not found.</p>
      </Layout>
    )
  }

  const queue = auction.players.filter((p) => p.status === 'open')
  const unsold = auction.players.filter((p) => p.status === 'unsold')
  const queueGroups = groupByCombo(queue)
  const unsoldGroups = groupByCombo(unsold)
  const sortedBids = [...(bids?.bids ?? [])].sort((a, b) => b.timestamp - a.timestamp)
  const wallets = [...auction.teamManagers].sort((a, b) => b.remainingTokens - a.remainingTokens)
  const currentGroup = currentPlayer
    ? currentPlayer.comboId
      ? auction.players.filter((p) => p.comboId === currentPlayer.comboId)
      : [currentPlayer]
    : []

  async function handleAssign(playerId: string) {
    const teamId = assignTeamByPlayer[playerId]
    if (!teamId || !auctionId) return
    const raw = assignAmountByPlayer[playerId]
    const amount = raw && raw.trim() !== '' ? Number(raw) : undefined
    await run(() => assignUnsoldPlayer(auctionId, playerId, teamId, amount))
    setAssignTeamByPlayer((prev) => ({ ...prev, [playerId]: '' }))
    setAssignAmountByPlayer((prev) => ({ ...prev, [playerId]: '' }))
  }

  function toggleComboSelection(playerId: string) {
    setComboSelection((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  async function handleCreateCombo() {
    if (!auctionId || comboSelection.size < 2) return
    await run(() => createCombo(auctionId, [...comboSelection]))
    setComboSelection(new Set())
  }

  async function handleRestart() {
    if (!auctionId) return
    if (
      !confirm(
        `Discard the current live progress and restart "${auction?.name}" (${auctionId})? ` +
          'This clears every bid, resets every player back to open, and refunds every team\'s ' +
          'purse. It cannot be undone.',
      )
    ) {
      return
    }
    await run(() => restartAuction(auctionId))
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
      <AuctionBackground color={auction.bgColor} imageUrl={auction.backgroundImage} />
      <SoldCelebration sold={sold} onDone={clear} />
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-semibold text-gray-900 dark:text-gray-100"
              style={{ color: auction.titleColor || undefined }}
            >
              {auction.name} <span className="text-gray-400 font-mono text-lg">#{auction.auctionId}</span>
            </h1>
            <p className="text-sm text-gray-500" style={{ color: auction.secondaryColor || undefined }}>
              Status: {auction.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/results/${auction.auctionId}`}
              className="rounded-lg btn-glass border px-4 py-2 text-sm font-medium"
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
            {auction.status === 'live' && user?.role === 'admin' && (
              <button
                onClick={handleRestart}
                disabled={busy}
                title="Emergency reset: wipes all bids and player/team progress back to draft"
                className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
              >
                Discard &amp; restart
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="glass-card lg:col-span-2 p-6">
            <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">Current player</h2>
            {!currentPlayer ? (
              <p className="relative z-[3] mt-3 text-sm text-gray-500">No player is currently on the block.</p>
            ) : (
              <div className="relative z-[3] mt-4 space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar
                    name={currentPlayer.name}
                    encryptedPhoto={currentPlayer.encryptedPhoto}
                    photoURL={currentPlayer.photoURL}
                    avatarId={currentPlayer.avatarId}
                    shape="square"
                    size={36}
                    enlargeOnClick
                  />
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {currentGroup.map((p) => p.name).join(' + ')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {currentGroup.length > 1
                          ? `Combo of ${currentGroup.length} · Base price ${currentGroup.reduce((sum, p) => sum + p.basePrice, 0)}`
                          : `${currentPlayer.position} · Base price ${currentPlayer.basePrice}`}
                      </p>
                    </div>
                    <PlayerProfileBadges
                      battingHandedness={currentPlayer.battingHandedness}
                      bowlingHandedness={currentPlayer.bowlingHandedness}
                      battingType={currentPlayer.battingType}
                      bowlingType={currentPlayer.bowlingType}
                    />
                  </div>
                </div>

                <div className="rounded-lg surface-inset p-4">
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
                        className="input-glass w-20 rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={() => run(() => startTimer(auctionId, Number(timerDuration) || 30))}
                        disabled={busy}
                        className="btn-brand rounded-lg px-3 py-1.5 text-sm font-medium"
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
                        className="rounded-lg btn-glass border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
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
                    className="rounded-lg btn-glass border px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Mark unsold
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bid history</h3>
                  <ul className="mt-2 space-y-1 text-sm max-h-48 overflow-y-auto">
                    {sortedBids.map((b, i) => (
                      <li key={i} className="flex justify-between gap-2 text-gray-600 dark:text-gray-400">
                        <span className="truncate">{b.managerName}</span>
                        <span className="shrink-0 font-mono">{b.amount}</span>
                      </li>
                    ))}
                    {sortedBids.length === 0 && <li className="text-gray-500">No bids yet.</li>}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <section className="glass-card p-6">
            <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">Next up</h2>
            <p className="relative z-[3] mt-1 text-xs text-gray-500 dark:text-gray-400">
              Check 2 or more to auction them together as a combo — the winning bid splits equally
              across the group when sold.
            </p>
            <ul className="relative z-[3] mt-3 space-y-2">
              {queueGroups.map((group) => {
                const lead = group[0]
                const isCombo = group.length > 1
                return (
                  <li
                    key={lead.comboId ?? lead.playerId}
                    className="flex items-center justify-between gap-2 rounded-lg surface-inset px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {!isCombo && (
                        <input
                          type="checkbox"
                          checked={comboSelection.has(lead.playerId)}
                          onChange={() => toggleComboSelection(lead.playerId)}
                          className="shrink-0"
                        />
                      )}
                      <span className="truncate text-gray-900 dark:text-gray-100">
                        {group.map((p) => p.name).join(' + ')}
                        {isCombo && <span className="text-gray-500"> (combo)</span>}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {isCombo && lead.comboId && (
                        <button
                          onClick={() => run(() => breakCombo(auctionId, lead.comboId!))}
                          disabled={busy}
                          className="font-medium text-gray-500 hover:underline disabled:opacity-50"
                        >
                          Break up
                        </button>
                      )}
                      <button
                        onClick={() => run(() => setCurrentPlayer(auctionId, lead.playerId))}
                        disabled={busy || !!currentPlayer}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50"
                      >
                        Start
                      </button>
                    </span>
                  </li>
                )
              })}
              {queueGroups.length === 0 && <li className="text-sm text-gray-500">Queue is empty.</li>}
            </ul>
            {comboSelection.size > 0 && (
              <div className="relative z-[3] mt-3 flex items-center justify-between gap-2 rounded-lg surface-inset px-3 py-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">{comboSelection.size} selected</span>
                <button
                  onClick={handleCreateCombo}
                  disabled={busy || comboSelection.size < 2}
                  className="btn-brand rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50"
                >
                  Create combo
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="glass-card p-6">
          <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">Team squads</h2>
          <div className="relative z-[3] mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wallets.map((tm) => {
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
                      Balance <span className="font-mono text-gray-900 dark:text-gray-100">{tm.remainingTokens}</span>
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
                      <li
                        key={p.playerId}
                        className="flex justify-between gap-2 text-gray-600 dark:text-gray-400"
                      >
                        <span className="min-w-0 truncate flex items-center gap-1.5">
                          <span className="truncate">{p.name}</span>
                          {p.comboId && (
                            <span
                              title="Sold as part of a combo lot — price is an equal split"
                              className="shrink-0 inline-block h-2 w-2 rounded-full bg-blue-500"
                            />
                          )}
                          {p.wasUnsoldAssigned && (
                            <span
                              title="Went unsold, later assigned to this team"
                              className="shrink-0 inline-block h-2 w-2 rounded-full bg-amber-500"
                            />
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-mono">{p.currentBid}</span>
                          <button
                            onClick={() => {
                              if (
                                !confirm(
                                  `Remove ${p.name} from ${tm.name}? This refunds ${p.currentBid} to their ` +
                                    'purse and puts the player back in the queue to be re-auctioned.',
                                )
                              ) {
                                return
                              }
                              run(() => revertSale(auctionId, p.playerId))
                            }}
                            disabled={busy}
                            title="Sold to the wrong team? Undo it and refund the purse."
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                          >
                            Revert
                          </button>
                        </span>
                      </li>
                    ))}
                    {squad.length === 0 && (
                      <li className="text-gray-500">No players won yet.</li>
                    )}
                  </ul>
                </div>
              )
            })}
            {wallets.length === 0 && (
              <p className="text-sm text-gray-500">No teams added yet.</p>
            )}
          </div>
        </section>

        {unsold.length > 0 && (
          <section className="glass-card p-6">
            <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">Unsold players</h2>
            <p className="relative z-[3] mt-1 text-sm text-gray-500 dark:text-gray-400">
              Assign a leftover player directly to a team at base price — useful for clearing the
              unsold list before ending the auction.
            </p>
            <ul className="relative z-[3] mt-3 space-y-2">
              {unsoldGroups.map((group) => {
                const lead = group[0]
                const isCombo = group.length > 1
                const totalBase = group.reduce((sum, p) => sum + p.basePrice, 0)
                return (
                  <li
                    key={lead.comboId ?? lead.playerId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg surface-inset px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 break-words text-gray-900 dark:text-gray-100">
                      {group.map((p) => p.name).join(' + ')}{' '}
                      <span className="text-gray-500">
                        {isCombo ? `(combo) · Base ${totalBase}` : `(${lead.position}) · Base ${lead.basePrice}`}
                      </span>
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        value={assignAmountByPlayer[lead.playerId] ?? ''}
                        onChange={(e) =>
                          setAssignAmountByPlayer((prev) => ({ ...prev, [lead.playerId]: e.target.value }))
                        }
                        placeholder={`${totalBase}`}
                        title="Sell value (defaults to base price if left blank)"
                        className="input-glass w-24 rounded-md px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                      />
                      <select
                        value={assignTeamByPlayer[lead.playerId] ?? ''}
                        onChange={(e) =>
                          setAssignTeamByPlayer((prev) => ({ ...prev, [lead.playerId]: e.target.value }))
                        }
                        className="input-glass rounded-md px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Assign to team...</option>
                        {auction.teamManagers.map((tm) => (
                          <option key={tm.teamId} value={tm.teamId}>
                            {tm.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(lead.playerId)}
                        disabled={busy || !assignTeamByPlayer[lead.playerId]}
                        className="btn-brand rounded-md px-3 py-1 text-xs font-medium"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => run(() => returnPlayerToQueue(auctionId, lead.playerId))}
                        disabled={busy}
                        title="Marked unsold by mistake? Put them back in the queue."
                        className="rounded-md btn-glass border px-3 py-1 text-xs font-medium disabled:opacity-50"
                      >
                        Return to queue
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  )
}
