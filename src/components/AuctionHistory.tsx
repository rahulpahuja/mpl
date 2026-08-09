import { useAuctionsByIds } from '../hooks/useAuctionsByIds'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  live: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  completed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export function PlayerAuctionHistory({ assignedAuctions }: { assignedAuctions: string[] }) {
  const auctions = useAuctionsByIds(assignedAuctions)

  return (
    <div className="space-y-3 border-t border-gray-200 dark:border-gray-800 pt-4">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Auction history</h2>
      <div className="flex gap-6">
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {assignedAuctions.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Auctions taken part in</p>
        </div>
        <div>
          {/* Match-level stats aren't tracked yet — shown as NA until that data exists. */}
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">NA</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Matches played</p>
        </div>
      </div>
      {assignedAuctions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You haven't taken part in an auction yet.
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {assignedAuctions.map((auctionId) => {
            const auction = auctions[auctionId]
            return (
              <li
                key={auctionId}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200/80 dark:border-gray-800/80 px-3 py-2"
              >
                <span className="text-gray-900 dark:text-gray-100">{auction?.name ?? auctionId}</span>
                {auction && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[auction.status]}`}
                  >
                    {auction.status}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
