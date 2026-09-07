import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../store/authStore'
import { createAuction, deleteAuction, duplicateAuction } from '../lib/auctions'
import type { Auction } from '../types'
import '../styles/apex-arena.css'

const STATUS_CHIP: Record<Auction['status'], string> = {
  draft: 'aa-chip aa-chip-muted',
  live: 'aa-chip aa-chip-orange',
  completed: 'aa-chip aa-chip-mint',
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string | number
  hint: string
  accent?: 'orange' | 'mint' | 'live'
}) {
  const valueClass =
    accent === 'orange'
      ? 'aa-orange-text'
      : accent === 'mint'
        ? 'aa-mint-text'
        : accent === 'live'
          ? 'text-[#ef4444]'
          : ''
  return (
    <div className="aa-kpi">
      <p className="aa-label">{label}</p>
      <p className={`aa-numeric mt-1.5 text-2xl ${valueClass}`}>{value}</p>
      <p className="mt-2 border-t pt-2 text-xs aa-muted">{hint}</p>
    </div>
  )
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filtered = auctions.filter(
    (a) => !q || a.name.toLowerCase().includes(q) || a.auctionId.toLowerCase().includes(q),
  )
  const liveCount = auctions.filter((a) => a.status === 'live').length
  const draftCount = auctions.filter((a) => a.status === 'draft').length
  const completedCount = auctions.filter((a) => a.status === 'completed').length
  const playersPooled = auctions.reduce((n, a) => n + a.players.length, 0)

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

  function AuctionActions({ a }: { a: Auction }) {
    return (
      <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <Link to={`/admin/auctions/${a.auctionId}/setup`} className="font-medium aa-orange-text hover:underline">
          Setup
        </Link>
        <Link to={`/manage/${a.auctionId}`} className="font-medium aa-orange-text hover:underline">
          Manage
        </Link>
        <Link to={`/results/${a.auctionId}`} className="font-medium aa-orange-text hover:underline">
          Results
        </Link>
        <Link to={`/viewer/${a.auctionId}`} className="font-medium aa-orange-text hover:underline">
          View
        </Link>
        <button
          onClick={() => handleDuplicate(a.auctionId, a.name)}
          disabled={duplicatingId === a.auctionId}
          className="font-medium aa-orange-text hover:underline disabled:opacity-50"
        >
          {duplicatingId === a.auctionId ? 'Duplicating...' : 'Duplicate'}
        </button>
        <button
          onClick={() => handleDelete(a.auctionId, a.name)}
          disabled={deletingId === a.auctionId}
          className="font-medium text-rose-400 hover:underline disabled:opacity-50"
        >
          {deletingId === a.auctionId ? 'Deleting...' : 'Delete'}
        </button>
      </span>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <div className="apex-arena space-y-6">
          <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="aa-label aa-orange-text flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  gavel
                </span>
                Auctions Management
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="aa-head text-2xl sm:text-3xl">Auctions Directory</h1>
                <span className="aa-chip aa-chip-muted">{auctions.length} total</span>
              </div>
              <p className="mt-1 max-w-2xl text-sm aa-dim">
                Create auctions, configure franchise purses and player rosters, run live bidding, and
                review results.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Live now" value={liveCount} hint="Bidding rooms open" accent="live" />
            <KpiCard label="Drafts" value={draftCount} hint="Awaiting go-live" accent="orange" />
            <KpiCard label="Completed" value={completedCount} hint="Results available" accent="mint" />
            <KpiCard label="Players pooled" value={playersPooled} hint="Across all auctions" />
          </div>

          <div className="aa-card flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-[240px] xl:w-96">
              <span
                className="material-symbols-outlined aa-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px]"
                aria-hidden="true"
              >
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search auctions by name or ID…"
                className="aa-input pl-9"
              />
            </div>
            <div className="flex items-center gap-1 self-start rounded-md border border-[color:var(--aa-border-strong)] p-0.5 xl:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded px-3 py-1 text-sm font-medium ${
                  viewMode === 'grid' ? 'bg-[#ea580c] text-white' : 'aa-dim'
                }`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-1 text-sm font-medium ${
                  viewMode === 'list' ? 'bg-[#ea580c] text-white' : 'aa-dim'
                }`}
              >
                List
              </button>
            </div>
          </div>

          <div className="aa-panel flex flex-col gap-2 p-3 sm:flex-row">
            <input
              value={newAuctionName}
              onChange={(e) => setNewAuctionName(e.target.value)}
              placeholder="New auction name"
              className="aa-input flex-1"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newAuctionName.trim()}
              className="aa-btn aa-btn-primary"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                add
              </span>
              Create auction
            </button>
          </div>

          {loading ? (
            <p className="text-sm aa-muted">Loading auctions…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm aa-muted">
              {auctions.length === 0 ? 'No auctions yet.' : 'No auctions match this search.'}
            </p>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <div key={a.auctionId} className="aa-card flex flex-col overflow-hidden">
                  <div
                    className="relative h-28 w-full bg-[color:var(--aa-locker)] bg-cover bg-center"
                    style={a.backgroundImage ? { backgroundImage: `url(${a.backgroundImage})` } : undefined}
                  >
                    <span className={`absolute right-2 top-2 ${STATUS_CHIP[a.status]}`}>{a.status}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="aa-head truncate text-[15px]">{a.name}</p>
                    <p className="aa-numeric text-xs aa-muted">{a.auctionId}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border py-2 text-center">
                      <div>
                        <p className="aa-label">Players</p>
                        <p className="aa-numeric mt-0.5 text-sm">{a.players.length}</p>
                      </div>
                      <div className="border-x">
                        <p className="aa-label">Teams</p>
                        <p className="aa-numeric mt-0.5 text-sm">{a.teamManagers.length}</p>
                      </div>
                      <div>
                        <p className="aa-label">Status</p>
                        <p className="mt-0.5 text-sm capitalize">{a.status}</p>
                      </div>
                    </div>
                    <div className="mt-3 border-t pt-3">
                      <AuctionActions a={a} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <ul className="space-y-2 sm:hidden">
                {filtered.map((a) => (
                  <li key={a.auctionId} className="aa-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="aa-head truncate text-[15px]">{a.name}</p>
                        <p className="aa-numeric text-xs aa-muted">{a.auctionId}</p>
                      </div>
                      <span className={`shrink-0 ${STATUS_CHIP[a.status]}`}>{a.status}</span>
                    </div>
                    <p className="mt-2 text-xs aa-muted">
                      {a.players.length} players · {a.teamManagers.length} teams
                    </p>
                    <div className="mt-2">
                      <AuctionActions a={a} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="aa-card hidden overflow-x-auto sm:block">
                <table className="aa-table min-w-[640px]">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Players</th>
                      <th>Teams</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.auctionId}>
                        <td className="aa-numeric">{a.auctionId}</td>
                        <td className="font-medium">{a.name}</td>
                        <td>
                          <span className={STATUS_CHIP[a.status]}>{a.status}</span>
                        </td>
                        <td className="aa-numeric aa-dim">{a.players.length}</td>
                        <td className="aa-numeric aa-dim">{a.teamManagers.length}</td>
                        <td>
                          <AuctionActions a={a} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
