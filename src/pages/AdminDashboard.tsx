import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { useUsers } from '../hooks/useUsers'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { useInvites } from '../hooks/useInvites'
import { useAuthStore } from '../store/authStore'
import { createAuction } from '../lib/auctions'
import { createTeam } from '../lib/teams'
import { createInvite, deleteInvite } from '../lib/invites'
import { assignUserToAuction, updateUserRole } from '../lib/users'
import type { UserRole } from '../types'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  live: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  completed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user)
  const { auctions, loading } = useAuctionsList()
  const { users } = useUsers()
  const { teams } = useTeamsRegistry()
  const invites = useInvites()
  const [newAuctionName, setNewAuctionName] = useState('')
  const [creating, setCreating] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('manager')
  const [inviting, setInviting] = useState(false)

  const [teamName, setTeamName] = useState('')
  const [managerSearch, setManagerSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return true
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    )
  })

  const managerCandidates = users
    .filter((u) => u.role === 'manager')
    .filter((u) => {
      const q = managerSearch.trim().toLowerCase()
      if (!q) return true
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    })

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

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await createInvite(inviteEmail.trim(), inviteRole)
      setInviteEmail('')
      setInviteRole('manager')
    } finally {
      setInviting(false)
    }
  }

  async function handleCreateTeam() {
    if (!teamName.trim() || !selectedManagerId) return
    const manager = users.find((u) => u.uid === selectedManagerId)
    if (!manager) return
    setCreatingTeam(true)
    try {
      await createTeam(teamName.trim(), manager.uid, manager.displayName)
      setTeamName('')
      setSelectedManagerId('')
      setManagerSearch('')
    } finally {
      setCreatingTeam(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-10">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Teams</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Teams exist independently of any auction. Create one here, then add it to specific
            auctions from that auction's Setup page.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <input
              value={managerSearch}
              onChange={(e) => {
                setManagerSearch(e.target.value)
                setSelectedManagerId('')
              }}
              placeholder="Search manager by name, email, phone..."
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2"
            />
            <button
              onClick={handleCreateTeam}
              disabled={creatingTeam || !teamName.trim() || !selectedManagerId}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Create team
            </button>
          </div>

          {managerSearch && !selectedManagerId && (
            <ul className="mt-2 max-h-40 divide-y divide-gray-200 dark:divide-gray-800 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
              {managerCandidates.map((m) => (
                <li key={m.uid}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManagerId(m.uid)
                      setManagerSearch(`${m.displayName} (${m.phone || m.email})`)
                    }}
                    className="block w-full px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {m.displayName} <span className="text-gray-500">— {m.phone || m.email}</span>
                  </button>
                </li>
              ))}
              {managerCandidates.length === 0 && (
                <li className="px-3 py-2 text-gray-500">
                  No "Team Manager" users match. Promote someone to Team Manager below first.
                </li>
              )}
            </ul>
          )}

          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            {teams.map((t) => (
              <li key={t.teamId} className="flex justify-between py-2">
                <span className="text-gray-900 dark:text-gray-100">{t.teamName}</span>
                <span className="text-gray-500">Manager: {t.managerName}</span>
              </li>
            ))}
            {teams.length === 0 && <li className="py-2 text-gray-500">No teams created yet.</li>}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Users</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add someone by their Gmail address before they've ever signed in — the role you pick
            here is applied automatically the moment they sign in with that Google account.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@gmail.com"
              type="email"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="admin">Admin</option>
              <option value="auctionManager">Auction Manager</option>
              <option value="manager">Team Manager</option>
              <option value="player">Player</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Add user
            </button>
          </div>

          {invites.length > 0 && (
            <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              {invites.map((inv) => (
                <li key={inv.email} className="flex items-center justify-between py-1.5">
                  <span className="text-gray-600 dark:text-gray-400">
                    {inv.email} <span className="text-gray-400">— pending as {inv.role}</span>
                  </span>
                  <button
                    onClick={() => deleteInvite(inv.email)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="mt-4 w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Assign to auction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{u.displayName}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {u.phone || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                      >
                        <option value="admin">Admin</option>
                        <option value="auctionManager">Auction Manager</option>
                        <option value="manager">Team Manager</option>
                        <option value="player">Player</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value)
                            assignUserToAuction(u.uid, e.target.value, u.assignedAuctions, u.role)
                          e.target.value = ''
                        }}
                        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select auction...</option>
                        {auctions.map((a) => (
                          <option key={a.auctionId} value={a.auctionId}>
                            {a.name} ({a.auctionId})
                          </option>
                        ))}
                      </select>
                      {u.assignedAuctions.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          {u.assignedAuctions.join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-gray-500">
                      No users match "{userSearch}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  )
}
