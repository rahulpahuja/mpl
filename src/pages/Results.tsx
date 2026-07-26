import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAuction } from '../hooks/useAuction'
import { useTeams } from '../hooks/useTeams'

export function Results() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  const teams = useTeams(auctionId)

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
      <div className="space-y-10">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {auction.name} — Results
          </h1>
          <p className="text-sm text-gray-500">
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
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{team.teamName}</h3>
                  <span className="text-sm text-gray-500">Balance {team.balance}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Spent {team.spent} of {team.initialPurse}
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {team.players.map((p) => (
                    <li key={p.playerId} className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>{p.playerName}</span>
                      <span className="font-mono">{p.soldAt}</span>
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
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm">
            <table className="w-full text-sm">
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
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{p.name}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{p.position}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {p.currentBidderName}
                    </td>
                    <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">
                      {p.currentBid}
                    </td>
                  </tr>
                ))}
                {sold.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-gray-500">
                      No players sold yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {unsold.length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Unsold players</h2>
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
          </section>
        )}
      </div>
    </Layout>
  )
}
