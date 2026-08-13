import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AuctionBackground } from '../components/AuctionBackground'
import { TeamAvatar } from '../components/TeamAvatar'
import { useAuction } from '../hooks/useAuction'
import { useTeams } from '../hooks/useTeams'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../store/authStore'
import { assignUnsoldPlayer } from '../lib/auctions'

export function Results() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  usePageTitle(auction ? `${auction.name} · Results` : 'Auction results')
  const teams = useTeams(auctionId)
  const user = useAuthStore((s) => s.user)
  const canAssign = user?.role === 'admin' || user?.role === 'auctionManager'
  const [assignTeamByPlayer, setAssignTeamByPlayer] = useState<Record<string, string>>({})
  const [assigning, setAssigning] = useState(false)

  async function handleAssign(playerId: string) {
    const teamId = assignTeamByPlayer[playerId]
    if (!teamId || !auctionId) return
    setAssigning(true)
    try {
      await assignUnsoldPlayer(auctionId, playerId, teamId)
      setAssignTeamByPlayer((prev) => ({ ...prev, [playerId]: '' }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign player')
    } finally {
      setAssigning(false)
    }
  }

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

  const sold = auction.players.filter((p) => p.status === 'sold')
  const unsold = auction.players.filter((p) => p.status === 'unsold')
  const sortedTeams = [...teams].sort((a, b) => b.spent - a.spent)

  return (
    <Layout>
      <AuctionBackground color={auction.bgColor} imageUrl={auction.backgroundImage} />
      <div className="space-y-10">
        <div>
          <h1
            className="text-2xl font-semibold text-gray-900 dark:text-gray-100"
            style={{ color: auction.titleColor || undefined }}
          >
            {auction.name} — Results
          </h1>
          <p className="text-sm text-gray-500" style={{ color: auction.secondaryColor || undefined }}>
            Auction ID: <span className="font-mono">{auction.auctionId}</span> · {sold.length} sold ·{' '}
            {unsold.length} unsold
          </p>
        </div>

        <section>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Team strength</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTeams.map((team) => (
              <div
                key={team.teamId}
                className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                    <TeamAvatar
                      teamName={team.teamName}
                      logoId={team.logoId}
                      logoImage={team.logoImage}
                      jerseyColor={team.jerseyColor}
                    />
                    <span className="truncate">{team.teamName}</span>
                  </h3>
                  <span className="shrink-0 text-sm text-gray-500">Balance {team.balance}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Spent {team.spent} of {team.initialPurse}
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {team.players.map((p) => (
                    <li key={p.playerId} className="flex justify-between gap-2 text-gray-600 dark:text-gray-400">
                      <span className="min-w-0 truncate flex items-center gap-1.5">
                        <span className="truncate">{p.playerName}</span>
                        {p.wasUnsoldAssigned && (
                          <span
                            title="Went unsold, later assigned to this team"
                            className="shrink-0 inline-block h-2 w-2 rounded-full bg-amber-500"
                          />
                        )}
                      </span>
                      <span className="shrink-0 font-mono">{p.soldAt}</span>
                    </li>
                  ))}
                  {team.players.length === 0 && (
                    <li className="text-gray-500">No players acquired.</li>
                  )}
                </ul>
              </div>
            ))}
            {sortedTeams.length === 0 && (
              <p className="text-sm text-gray-500">No teams registered.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Sold players</h2>
          {sold.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No players sold yet.</p>
          ) : (
            <>
              <ul className="mt-4 space-y-2 sm:hidden">
                {sold.map((p) => (
                  <li
                    key={p.playerId}
                    className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.position}</p>
                      </div>
                      <p className="shrink-0 font-mono text-gray-900 dark:text-gray-100">{p.currentBid}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Sold to {p.currentBidderName}
                    </p>
                    {p.wasUnsoldAssigned && (
                      <span
                        title="Went unsold in the auction, later force-assigned to this team"
                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Unsold → reassigned
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-4 hidden overflow-x-auto rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm sm:block">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Player</th>
                      <th className="px-4 py-2 font-medium">Position</th>
                      <th className="px-4 py-2 font-medium">Sold to</th>
                      <th className="px-4 py-2 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {sold.map((p) => (
                      <tr key={p.playerId}>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                          <span className="inline-flex items-center gap-1.5">
                            {p.name}
                            {p.wasUnsoldAssigned && (
                              <span
                                title="Went unsold in the auction, later force-assigned to this team"
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Unsold → reassigned
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{p.position}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {p.currentBidderName}
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">
                          {p.currentBid}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {unsold.length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Unsold players</h2>
            {canAssign ? (
              <ul className="mt-3 space-y-2">
                {unsold.map((p) => (
                  <li
                    key={p.playerId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 break-words text-gray-900 dark:text-gray-100">
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
                        disabled={assigning || !assignTeamByPlayer[p.playerId]}
                        className="rounded-md bg-gray-800 dark:bg-gray-200 px-3 py-1 text-xs font-medium text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {unsold.map((p) => (
                  <li
                    key={p.playerId}
                    className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm text-gray-600 dark:text-gray-300"
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </Layout>
  )
}
