import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { useAuthStore } from '../store/authStore'
import { createAuction, deleteAuction } from '../lib/auctions'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  live: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  completed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export function AdminAuctions() {
  const user = useAuthStore((s) => s.user)
  const { auctions, loading } = useAuctionsList()
  const [newAuctionName, setNewAuctionName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate() {
    if (!newAuctionName.trim() || !user) return
    setCreating(true)
    try {
      await createAuction(newAuctionName.trim(), user.uid)
      setNewAuctionName('')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(auctionId: string, name: string) {
    if (!confirm(`Delete "${name}" (${auctionId})? This permanently removes it and cannot be undone.`)) {
      return
    }
    setDeletingId(auctionId)
    try {
      await deleteAuction(auctionId)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Auctions</h1>
          <div className="mt-4 flex gap-2">
            <input
              value={newAuctionName}
              onChange={(e) => setNewAuctionName(e.target.value)}
              placeholder="New auction name"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newAuctionName.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Create auction
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-gray-500">Loading auctions...</p>
          ) : auctions.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No auctions yet.</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">ID</th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Players</th>
                    <th className="px-4 py-2 font-medium">Teams</th>
                    <th className="px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {auctions.map((a) => (
                    <tr key={a.auctionId}>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">
                        {a.auctionId}
                      </td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{a.name}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[a.status]}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                        {a.players.length}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                        {a.teamManagers.length}
                      </td>
                      <td className="px-4 py-2 text-right space-x-3">
                        <Link
                          to={`/admin/auctions/${a.auctionId}/setup`}
                          className="text-red-600 dark:text-red-400 hover:underline"
                        >
                          Setup
                        </Link>
                        <Link
                          to={`/manage/${a.auctionId}`}
                          className="text-red-600 dark:text-red-400 hover:underline"
                        >
                          Manage
                        </Link>
                        <Link
                          to={`/results/${a.auctionId}`}
                          className="text-red-600 dark:text-red-400 hover:underline"
                        >
                          Results
                        </Link>
                        <Link
                          to={`/viewer/${a.auctionId}`}
                          className="text-red-600 dark:text-red-400 hover:underline"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(a.auctionId, a.name)}
                          disabled={deletingId === a.auctionId}
                          className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                        >
                          {deletingId === a.auctionId ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
