import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../store/authStore'
import { createAuction, deleteAuction, duplicateAuction } from '../lib/auctions'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  live: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  completed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export function AdminAuctions() {
  usePageTitle('Admin · Auctions')
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { auctions, loading } = useAuctionsList()
  const [newAuctionName, setNewAuctionName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

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

  async function handleDuplicate(auctionId: string, name: string) {
    if (!confirm(`Duplicate "${name}"? This recreates the same players, teams, and settings as a new draft auction.`)) {
      return
    }
    setDuplicatingId(auctionId)
    try {
      const newAuctionId = await duplicateAuction(auctionId)
      navigate(`/admin/auctions/${newAuctionId}/setup`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate auction')
    } finally {
      setDuplicatingId(null)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Auctions</h1>
          <div className="glass-card mt-4 flex gap-2 p-4">
            <input
              value={newAuctionName}
              onChange={(e) => setNewAuctionName(e.target.value)}
              placeholder="New auction name"
              className="input-glass relative z-[3] flex-1 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newAuctionName.trim()}
              className="btn-brand relative z-[3] rounded-lg px-4 py-2 text-sm font-medium"
            >
              Create auction
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-gray-500">Loading auctions...</p>
          ) : auctions.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No auctions yet.</p>
          ) : (
            <>
              <ul className="mt-6 space-y-2 sm:hidden">
                {auctions.map((a) => (
                  <li key={a.auctionId} className="glass-card p-3">
                    <div className="relative z-[3] flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{a.name}</p>
                        <p className="font-mono text-xs text-gray-500">{a.auctionId}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[a.status]}`}
                      >
                        {a.status}
                      </span>
                    </div>
                    <p className="relative z-[3] mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {a.players.length} players · {a.teamManagers.length} teams
                    </p>
                    <div className="relative z-[3] mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      <Link
                        to={`/admin/auctions/${a.auctionId}/setup`}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        Setup
                      </Link>
                      <Link
                        to={`/manage/${a.auctionId}`}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        Manage
                      </Link>
                      <Link
                        to={`/results/${a.auctionId}`}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        Results
                      </Link>
                      <Link
                        to={`/viewer/${a.auctionId}`}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDuplicate(a.auctionId, a.name)}
                        disabled={duplicatingId === a.auctionId}
                        className="font-medium text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50"
                      >
                        {duplicatingId === a.auctionId ? 'Duplicating...' : 'Duplicate'}
                      </button>
                      <button
                        onClick={() => handleDelete(a.auctionId, a.name)}
                        disabled={deletingId === a.auctionId}
                        className="font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                      >
                        {deletingId === a.auctionId ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="glass-card relative z-[3] mt-6 hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="surface-inset text-left text-gray-500 dark:text-gray-400">
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
                            className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            Setup
                          </Link>
                          <Link
                            to={`/manage/${a.auctionId}`}
                            className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            Manage
                          </Link>
                          <Link
                            to={`/results/${a.auctionId}`}
                            className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            Results
                          </Link>
                          <Link
                            to={`/viewer/${a.auctionId}`}
                            className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDuplicate(a.auctionId, a.name)}
                            disabled={duplicatingId === a.auctionId}
                            className="font-medium text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50"
                          >
                            {duplicatingId === a.auctionId ? 'Duplicating...' : 'Duplicate'}
                          </button>
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
            </>
          )}
        </section>
      </div>
    </Layout>
  )
}
