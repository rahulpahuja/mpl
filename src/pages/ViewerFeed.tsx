import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AuctionBackground } from '../components/AuctionBackground'
import { Avatar } from '../components/Avatar'
import { PlayerProfileBadges } from '../components/PlayerProfileBadges'
import { TeamAvatar } from '../components/TeamAvatar'
import { useAuction } from '../hooks/useAuction'
import { useBids } from '../hooks/useBids'
import { useCountdown } from '../hooks/useCountdown'
import { usePageTitle } from '../hooks/usePageTitle'

export function ViewerFeed() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  usePageTitle(auction ? `${auction.name} · Live` : 'Live auction')
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
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Full results
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Live scoreboard</h2>
            {!currentPlayer ? (
              <p className="mt-3 text-sm text-gray-500">Waiting for the next player...</p>
            ) : (
              <div className="mt-4 space-y-4">
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
                    <span className="self-center text-2xl font-mono text-gray-900 dark:text-gray-100 sm:shrink-0 sm:self-auto">
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

          <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Team standings</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {standings.map((tm) => (
                <li
                  key={tm.managerId}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2"
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
