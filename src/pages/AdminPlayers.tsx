import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { Avatar } from '../components/Avatar'
import { UserDetailModal } from '../components/UserDetailModal'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { useUsers } from '../hooks/useUsers'
import { usePageTitle } from '../hooks/usePageTitle'
import { promoteViewerToPlayer } from '../lib/users'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'
import type { AppUser } from '../types'

function matchesQuery(u: AppUser, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    u.displayName.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    (u.phone?.includes(q) ?? false)
  )
}

function roleLabel(u: AppUser): string | null {
  return u.playingRole ? PLAYING_ROLE_LABELS[u.playingRole] : null
}

function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: string
  accent?: 'orange' | 'mint'
}) {
  return (
    <div className="aa-tile flex items-center justify-between gap-3">
      <div>
        <p className="aa-label">{label}</p>
        <p
          className={`aa-numeric mt-0.5 text-xl ${
            accent === 'orange' ? 'aa-orange-text' : accent === 'mint' ? 'aa-mint-text' : ''
          }`}
        >
          {value}
        </p>
      </div>
      <span className="material-symbols-outlined aa-muted text-[22px]" aria-hidden="true">
        {icon}
      </span>
    </div>
  )
}

export function AdminPlayers() {
  usePageTitle('Admin · Players')
  const { users } = useUsers()
  const { auctions } = useAuctionsList()
  const auctionNameById = Object.fromEntries(auctions.map((a) => [a.auctionId, a.name]))
  const [playerSearch, setPlayerSearch] = useState('')
  const [viewerSearch, setViewerSearch] = useState('')
  const [selectedViewerId, setSelectedViewerId] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const selectedPlayer = users.find((u) => u.uid === selectedPlayerId) ?? null

  const allPlayers = users.filter((u) => u.role === 'player')
  const players = allPlayers.filter((u) => matchesQuery(u, playerSearch))
  const inAuctionCount = allPlayers.filter((p) => p.assignedAuctions.length > 0).length

  const viewerCandidates = users
    .filter((u) => u.role === 'viewer')
    .filter((u) => matchesQuery(u, viewerSearch))
    .sort((a, b) => Number(b.playerRequested) - Number(a.playerRequested))
  const pendingPlayerRequests = users.filter((u) => u.role === 'viewer' && u.playerRequested)

  async function handlePromoteViewer() {
    if (!selectedViewerId) return
    setPromoting(true)
    try {
      await promoteViewerToPlayer(selectedViewerId)
      setSelectedViewerId('')
      setViewerSearch('')
    } finally {
      setPromoting(false)
    }
  }

  async function handleApproveRequest(uid: string) {
    setPromoting(true)
    try {
      await promoteViewerToPlayer(uid)
    } finally {
      setPromoting(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <div className="apex-arena space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="aa-head text-2xl sm:text-3xl">Players Directory</h1>
              <span className="aa-chip aa-chip-muted">{allPlayers.length} registered</span>
            </div>
            <p className="mt-1 max-w-2xl text-sm aa-dim">
              Promote signed-in Viewers to Players, then add them to an auction's roster from that
              auction's Setup page.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Total players" value={allPlayers.length} icon="groups" />
            <StatTile
              label="In an auction"
              value={inAuctionCount}
              icon="gavel"
              accent="mint"
            />
            <StatTile
              label="Not yet assigned"
              value={allPlayers.length - inAuctionCount}
              icon="person_search"
              accent="orange"
            />
            <StatTile
              label="Pending requests"
              value={pendingPlayerRequests.length}
              icon="how_to_reg"
            />
          </div>

          <div className="aa-panel p-4 sm:p-5">
            <h2 className="aa-head flex items-center gap-2 text-base">
              <span className="material-symbols-outlined aa-orange-text" aria-hidden="true">
                upgrade
              </span>
              Promote Viewer to Player
            </h2>
            <p className="mt-1 text-sm aa-dim">
              Anyone signed in as a Viewer can be converted to an official Player.
            </p>

            {pendingPlayerRequests.length > 0 && (
              <ul className="mt-3 space-y-2">
                {pendingPlayerRequests.map((v) => (
                  <li
                    key={v.uid}
                    className="aa-card flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 break-words">
                      <span className="font-medium">{v.displayName}</span>{' '}
                      <span className="aa-muted">— {v.phone || v.email}</span>
                      <span className="aa-chip aa-chip-orange ml-2">Requested</span>
                    </span>
                    <button
                      onClick={() => handleApproveRequest(v.uid)}
                      disabled={promoting}
                      className="aa-btn aa-btn-ghost text-xs disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <span
                  className="material-symbols-outlined aa-muted pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px]"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  value={viewerSearch}
                  onChange={(e) => {
                    setViewerSearch(e.target.value)
                    setSelectedViewerId('')
                  }}
                  placeholder="Search viewers by name, email, phone…"
                  className="aa-input pl-9"
                />
              </div>
              <button
                onClick={handlePromoteViewer}
                disabled={promoting || !selectedViewerId}
                className="aa-btn aa-btn-primary"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  check_circle
                </span>
                Promote to Player
              </button>
            </div>

            {viewerSearch && !selectedViewerId && (
              <ul className="aa-card mt-2 max-h-40 divide-y overflow-y-auto text-sm">
                {viewerCandidates.map((v) => (
                  <li key={v.uid}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedViewerId(v.uid)
                        setViewerSearch(`${v.displayName} (${v.phone || v.email})`)
                      }}
                      className="block w-full break-words px-3 py-2 text-left hover:bg-white/5"
                    >
                      {v.displayName} <span className="aa-muted">— {v.phone || v.email}</span>
                      {v.playerRequested && (
                        <span className="aa-chip aa-chip-orange ml-2">Requested</span>
                      )}
                    </button>
                  </li>
                ))}
                {viewerCandidates.length === 0 && (
                  <li className="aa-muted px-3 py-2">No "Viewer" users match.</li>
                )}
              </ul>
            )}
          </div>

          <div>
            <div className="relative max-w-sm">
              <span
                className="material-symbols-outlined aa-muted pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px]"
                aria-hidden="true"
              >
                search
              </span>
              <input
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Search players by name, email, or phone…"
                className="aa-input pl-9"
              />
            </div>

            {players.length === 0 ? (
              <p className="mt-4 text-sm aa-muted">
                {playerSearch ? `No players match "${playerSearch}".` : 'No players yet.'}
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-2 sm:hidden">
                  {players.map((p) => (
                    <li key={p.uid} className="aa-card p-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={p.displayName}
                          filenPhotoId={p.filenPhotoId}
                          encryptedPhoto={p.encryptedPhoto}
                          photoURL={p.photoURL}
                          avatarId={p.avatarId}
                          enlargeOnClick
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {p.displayName}
                            {p.jerseyNumber != null && (
                              <span className="aa-numeric aa-muted"> #{p.jerseyNumber}</span>
                            )}
                          </p>
                          <p className="truncate text-xs aa-muted">{p.email}</p>
                        </div>
                        <button
                          onClick={() => setSelectedPlayerId(p.uid)}
                          className="aa-btn aa-btn-ghost ml-auto shrink-0 text-xs"
                        >
                          Profile
                        </button>
                      </div>
                      <dl className="mt-2 space-y-1 text-xs aa-muted">
                        <div className="flex items-center justify-between gap-2">
                          <dt>Phone</dt>
                          <dd className="flex items-center gap-1.5 text-right">
                            <span className="aa-numeric">{p.phone || '—'}</span>
                            <WhatsAppButton
                              phone={p.whatsapp || p.phone}
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e] text-white"
                            />
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Playing role</dt>
                          <dd className="text-right">{roleLabel(p) ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Assigned auctions</dt>
                          <dd className="min-w-0 text-right">
                            {p.assignedAuctions.length > 0
                              ? p.assignedAuctions.map((id) => auctionNameById[id] ?? id).join(', ')
                              : 'Not added yet'}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>

                <div className="aa-card mt-4 hidden overflow-x-auto sm:block">
                  <table className="aa-table min-w-[720px]">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Role &amp; Jersey</th>
                        <th>Contact</th>
                        <th>Assigned Auctions</th>
                        <th>Auctions</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p) => (
                        <tr key={p.uid}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                name={p.displayName}
                                filenPhotoId={p.filenPhotoId}
                                encryptedPhoto={p.encryptedPhoto}
                                photoURL={p.photoURL}
                                avatarId={p.avatarId}
                              />
                              <div className="min-w-0">
                                <p className="font-medium">{p.displayName}</p>
                                {p.userCode && (
                                  <p className="aa-numeric text-xs aa-muted">ID #{p.userCode}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {roleLabel(p) ? (
                              <span className="aa-chip aa-chip-orange">{roleLabel(p)}</span>
                            ) : (
                              <span className="aa-muted">—</span>
                            )}
                            {p.jerseyNumber != null && (
                              <span className="aa-numeric aa-muted ml-2">#{p.jerseyNumber}</span>
                            )}
                          </td>
                          <td>
                            <div className="aa-dim">{p.email}</div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="aa-numeric aa-muted">{p.phone || '—'}</span>
                              <WhatsAppButton
                                phone={p.whatsapp || p.phone}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e] text-white"
                              />
                            </div>
                          </td>
                          <td>
                            {p.assignedAuctions.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.assignedAuctions.map((id) => (
                                  <span key={id} className="aa-chip aa-chip-muted">
                                    {auctionNameById[id] ?? id}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="aa-muted">Not added yet</span>
                            )}
                          </td>
                          <td className="aa-numeric aa-dim">{p.assignedAuctions.length}</td>
                          <td>
                            <button
                              onClick={() => setSelectedPlayerId(p.uid)}
                              className="aa-btn aa-btn-ghost text-xs"
                            >
                              <span
                                className="material-symbols-outlined text-[16px]"
                                aria-hidden="true"
                              >
                                visibility
                              </span>
                              Profile
                            </button>
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
      </div>
      <UserDetailModal
        user={selectedPlayer}
        auctionNameById={auctionNameById}
        onClose={() => setSelectedPlayerId(null)}
      />
    </Layout>
  )
}
