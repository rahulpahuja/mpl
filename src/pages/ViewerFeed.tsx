import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AuctionBackground } from '../components/AuctionBackground'
import { Avatar } from '../components/Avatar'
import { PlayerProfileBadges } from '../components/PlayerProfileBadges'
import { TeamAvatar } from '../components/TeamAvatar'
import { SoldCelebration } from '../components/SoldCelebration'
import { useAuction } from '../hooks/useAuction'
import { useBids } from '../hooks/useBids'
import { useBidSound } from '../hooks/useBidSound'
import { useCountdown } from '../hooks/useCountdown'
import { useJustSoldPlayer } from '../hooks/useJustSoldPlayer'
import { usePageTitle } from '../hooks/usePageTitle'

export function ViewerFeed() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  usePageTitle(auction ? `${auction.name} · Live` : 'Live auction')
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

  if (!auction) {
    return (
      <Layout>
        <p className="text-gray-500">No auction found for ID "{auctionId}".</p>
      </Layout>
    )
  }

  const sortedBids = [...(bids?.bids ?? [])].sort((a, b) => b.timestamp - a.timestamp)
  const standings = [...auction.teamManagers].sort((a, b) => b.tokensSpent - a.tokensSpent)

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
          <Link
            to={`/results/${auction.auctionId}`}
            className="rounded-lg btn-glass border px-4 py-2 text-sm font-medium"
          >
            Full results
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="glass-card lg:col-span-2 p-6">
            <h2 className="relative z-[3] flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              Live scoreboard
              {currentPlayer && (
                <span className="relative flex h-2 w-2" title="On the block now">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500" style={{ animation: 'live-pulse-ring 1.6s ease-out infinite' }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
            </h2>
            {!currentPlayer ? (
              <p className="relative z-[3] mt-3 text-sm text-gray-500">Waiting for the next player...</p>
            ) : (
              <div className="relative z-[3] mt-4 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
                    <Avatar
                      name={currentPlayer.name}
                      encryptedPhoto={currentPlayer.encryptedPhoto}
                      photoURL={currentPlayer.photoURL}
                      avatarId={currentPlayer.avatarId}
                      shape="square"
                      size={72}
                      mobileSize={32}
                    />
                    <div className="min-w-0 space-y-1.5">
                      <div>
                        <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          {currentPlayer.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {currentPlayer.position} · Base price {currentPlayer.basePrice}
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
                  {remaining !== null && (
                    <span
                      className={`self-center rounded-lg px-3 py-1 font-mono text-2xl font-bold tabular-nums sm:shrink-0 sm:self-auto ${
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
                    {currentPlayer.currentBidderName ?? 'No bids yet'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bid feed</h3>
                  <ul className="mt-2 space-y-1 text-sm max-h-56 overflow-y-auto">
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
            <h2 className="relative z-[3] text-lg font-medium text-gray-900 dark:text-gray-100">Team standings</h2>
            <ul className="relative z-[3] mt-3 space-y-2 text-sm">
              {standings.map((tm) => (
                <li
                  key={tm.managerId}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg surface-inset px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                    <TeamAvatar
                      teamName={tm.name}
                      logoId={tm.logoId}
                      logoImage={tm.logoImage}
                      jerseyColor={tm.jerseyColor}
                    />
                    <span className="truncate">{tm.name}</span>
                  </span>
                  <span className="shrink-0 text-gray-500">
                    Spent {tm.tokensSpent} · Left {tm.remainingTokens}
                  </span>
                </li>
              ))}
              {standings.length === 0 && <li className="text-sm text-gray-500">No teams yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  )
}
