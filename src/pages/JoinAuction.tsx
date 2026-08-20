import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { usePageTitle } from '../hooks/usePageTitle'

export function JoinAuction() {
  usePageTitle('Join an Auction')
  const navigate = useNavigate()
  const [auctionId, setAuctionId] = useState('')
  const { auctions, loading } = useAuctionsList()
  const liveAuctions = auctions.filter((a) => a.status === 'live')

  function handleJoin() {
    const id = auctionId.trim().toUpperCase()
    if (id) navigate(`/viewer/${id}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="glass-card w-full max-w-sm p-8">
      <div className="relative z-[3]">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Join an auction</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pick an ongoing auction below, or enter an auction ID directly.
        </p>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading ongoing auctions...</p>
          ) : liveAuctions.length === 0 ? (
            <p className="text-sm text-gray-500">No auctions are live right now.</p>
          ) : (
            <ul className="space-y-2">
              {liveAuctions.map((a) => (
                <li key={a.auctionId}>
                  <button
                    onClick={() => navigate(`/viewer/${a.auctionId}`)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200/80 dark:border-gray-700/80 bg-white/40 dark:bg-white/5 backdrop-blur-sm px-4 py-2.5 text-left hover:bg-white/70 dark:hover:bg-white/10"
                  >
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {a.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                      live
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 border-t border-gray-200/70 dark:border-gray-800/70 pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Or enter an auction ID directly:
          </p>
          <input
            value={auctionId}
            onChange={(e) => setAuctionId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="e.g. A1B2C3"
            className="input-glass mt-2 w-full rounded-lg px-4 py-2.5 text-sm uppercase tracking-widest text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={handleJoin}
            disabled={!auctionId.trim()}
            className="btn-brand mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            Join
          </button>
        </div>

        <div className="mt-6 border-t border-gray-200/70 dark:border-gray-800/70 pt-4 text-center">
          <a href="/login" className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline">
            Sign in as Admin / Manager instead
          </a>
        </div>
      </div>
      </div>
    </div>
  )
}
