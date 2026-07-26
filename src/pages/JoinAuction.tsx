import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function JoinAuction() {
  const navigate = useNavigate()
  const [auctionId, setAuctionId] = useState('')

  function handleJoin() {
    const id = auctionId.trim().toUpperCase()
    if (id) navigate(`/viewer/${id}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md p-8 shadow-xl shadow-red-950/5 dark:shadow-black/40 ring-1 ring-black/5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Join an auction</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter the auction ID shared with you to watch live bidding.
        </p>
        <input
          value={auctionId}
          onChange={(e) => setAuctionId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="e.g. A1B2C3"
          className="mt-6 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm uppercase tracking-widest text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          onClick={handleJoin}
          disabled={!auctionId.trim()}
          className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Join
        </button>
        <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4 text-center">
          <a href="/login" className="text-sm text-red-600 dark:text-red-400 hover:underline">
            Sign in as Admin / Manager instead
          </a>
        </div>
      </div>
    </div>
  )
}
