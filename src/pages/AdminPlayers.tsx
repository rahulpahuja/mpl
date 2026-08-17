import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { Avatar } from '../components/Avatar'
import { UserDetailModal } from '../components/UserDetailModal'
import { ChevronButton } from '../components/ChevronButton'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { useUsers } from '../hooks/useUsers'
import { usePageTitle } from '../hooks/usePageTitle'
import { promoteViewerToPlayer } from '../lib/users'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'

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

  const players = users
    .filter((u) => u.role === 'player')
    .filter((u) => {
      const q = playerSearch.trim().toLowerCase()
      if (!q) return true
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    })

  const viewerCandidates = users
    .filter((u) => u.role === 'viewer')
    .filter((u) => {
      const q = viewerSearch.trim().toLowerCase()
      if (!q) return true
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    })
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
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Players</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Anyone signed in as a Viewer can be promoted to Player, then added to an auction's
            roster from that auction's Setup page.
          </p>

          {pendingPlayerRequests.length > 0 && (
            <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-amber-300 dark:border-amber-700 text-sm">
              {pendingPlayerRequests.map((v) => (
                <li
                  key={v.uid}
                  className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 break-words text-gray-900 dark:text-gray-100">
                    {v.displayName} <span className="text-gray-500">— {v.phone || v.email}</span>
                    <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      Requested
                    </span>
                  </span>
                  <button
                    onClick={() => handleApproveRequest(v.uid)}
                    disabled={promoting}
                    className="self-start rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 sm:self-auto"
                  >
                    Approve
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              value={viewerSearch}
              onChange={(e) => {
                setViewerSearch(e.target.value)
                setSelectedViewerId('')
              }}
              placeholder="Search viewers by name, email, phone..."
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2"
            />
            <button
              onClick={handlePromoteViewer}
              disabled={promoting || !selectedViewerId}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Promote to Player
            </button>
          </div>
          {viewerSearch && !selectedViewerId && (
            <ul className="mt-2 max-h-40 divide-y divide-gray-200 dark:divide-gray-800 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
              {viewerCandidates.map((v) => (
                <li key={v.uid}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedViewerId(v.uid)
                      setViewerSearch(`${v.displayName} (${v.phone || v.email})`)
                    }}
                    className="block w-full px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 break-words"
                  >
                    {v.displayName} <span className="text-gray-500">— {v.phone || v.email}</span>
                    {v.playerRequested && (
                      <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Requested
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {viewerCandidates.length === 0 && (
                <li className="px-3 py-2 text-gray-500">No "Viewer" users match.</li>
              )}
            </ul>
          )}

          <input
            value={playerSearch}
            onChange={(e) => setPlayerSearch(e.target.value)}
            placeholder="Search players by name, email, or phone..."
            className="mt-6 w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {players.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              {playerSearch ? `No players match "${playerSearch}".` : 'No players yet.'}
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-2 sm:hidden">
                {players.map((p) => (
                  <li
                    key={p.uid}
                    className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={p.displayName}
                        filenPhotoId={p.filenPhotoId}
                        encryptedPhoto={p.encryptedPhoto}
                        photoURL={p.photoURL}
                        avatarId={p.avatarId}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                          {p.displayName}
                          {p.jerseyNumber != null && (
                            <span className="ml-1 text-gray-500">#{p.jerseyNumber}</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{p.email}</p>
                      </div>
                      <div className="ml-auto shrink-0">
                        <ChevronButton
                          onClick={() => setSelectedPlayerId(p.uid)}
                          label={`View ${p.displayName}'s profile`}
                        />
                      </div>
                    </div>
                    <dl className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex justify-between gap-2">
                        <dt>Phone</dt>
                        <dd className="text-right">{p.phone || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Playing role</dt>
                        <dd className="text-right">
                          {p.playingRole && PLAYING_ROLE_LABELS[p.playingRole]
                            ? PLAYING_ROLE_LABELS[p.playingRole]
                            : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Assigned auctions</dt>
                        <dd className="min-w-0 text-right">
                          {p.assignedAuctions.length > 0
                            ? p.assignedAuctions.map((id) => auctionNameById[id] ?? id).join(', ')
                            : 'Not added to any auction yet'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Matches played</dt>
                        <dd>NA</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

              <div className="mt-4 hidden overflow-x-auto rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm sm:block">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Jersey #</th>
                      <th className="px-4 py-2 font-medium">Role</th>
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Phone</th>
                      <th className="px-4 py-2 font-medium">Assigned auctions</th>
                      <th className="px-4 py-2 font-medium">Auctions played</th>
                      <th className="px-4 py-2 font-medium">Matches played</th>
                      <th className="px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {players.map((p) => (
                      <tr key={p.uid}>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={p.displayName}
                              filenPhotoId={p.filenPhotoId}
                              encryptedPhoto={p.encryptedPhoto}
                              photoURL={p.photoURL}
                              avatarId={p.avatarId}
                            />
                            {p.displayName}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {p.jerseyNumber ?? <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {p.playingRole && PLAYING_ROLE_LABELS[p.playingRole] ? (
                            PLAYING_ROLE_LABELS[p.playingRole]
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{p.email}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {p.phone || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {p.assignedAuctions.length > 0 ? (
                            p.assignedAuctions.map((id) => auctionNameById[id] ?? id).join(', ')
                          ) : (
                            <span className="text-gray-400">Not added to any auction yet</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {p.assignedAuctions.length}
                        </td>
                        {/* Match-level stats aren't tracked yet — shown as NA until that data exists. */}
                        <td className="px-4 py-2 text-gray-400">NA</td>
                        <td className="px-4 py-2">
                          <ChevronButton
                            onClick={() => setSelectedPlayerId(p.uid)}
                            label={`View ${p.displayName}'s profile`}
                          />
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
      <UserDetailModal
        user={selectedPlayer}
        auctionNameById={auctionNameById}
        onClose={() => setSelectedPlayerId(null)}
      />
    </Layout>
  )
}
