import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { Avatar } from '../components/Avatar'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { useAuctionsList } from '../hooks/useAuctionsList'
import { useUsers } from '../hooks/useUsers'
import { useInvites } from '../hooks/useInvites'
import { usePageTitle } from '../hooks/usePageTitle'
import { createInvite, deleteInvite } from '../lib/invites'
import { assignUserToAuction, updateUserRole } from '../lib/users'
import type { Auction, AppUser, UserRole } from '../types'

// Most-privileged to least — the order each role section is displayed in.
const ROLE_SECTIONS: { role: UserRole; label: string }[] = [
  { role: 'admin', label: 'Admin' },
  { role: 'auctionManager', label: 'Auction Manager' },
  { role: 'manager', label: 'Captain' },
  { role: 'player', label: 'Player' },
  { role: 'viewer', label: 'Viewer' },
]

function UserTable({
  users,
  auctions,
  auctionNameById,
}: {
  users: AppUser[]
  auctions: Auction[]
  auctionNameById: Record<string, string>
}) {
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Phone</th>
            <th className="px-4 py-2 font-medium"></th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Assign to auction</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {users.map((u) => (
            <tr key={u.uid}>
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={u.displayName}
                    encryptedPhoto={u.encryptedPhoto}
                    photoURL={u.photoURL}
                    avatarId={u.avatarId}
                  />
                  {u.displayName}
                </div>
              </td>
              <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{u.email}</td>
              <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                {u.phone || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-2">
                <WhatsAppButton phone={u.whatsapp || u.phone} />
              </td>
              <td className="px-4 py-2">
                <select
                  value={u.role}
                  onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="admin">Admin</option>
                  <option value="auctionManager">Auction Manager</option>
                  <option value="manager">Captain</option>
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
                    {u.assignedAuctions.map((id) => auctionNameById[id] ?? id).join(', ')}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminUsers() {
  usePageTitle('Admin · Users')
  const { auctions } = useAuctionsList()
  const auctionNameById = Object.fromEntries(auctions.map((a) => [a.auctionId, a.name]))
  const { users } = useUsers()
  const invites = useInvites()
  const [userSearch, setUserSearch] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('manager')
  const [inviting, setInviting] = useState(false)

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return true
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    )
  })

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

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Users</h1>
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
              <option value="manager">Captain</option>
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
                <li key={inv.email} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0 break-words text-gray-600 dark:text-gray-400">
                    {inv.email} <span className="text-gray-400">— pending as {inv.role}</span>
                  </span>
                  <button
                    onClick={() => deleteInvite(inv.email)}
                    className="shrink-0 text-xs text-red-600 dark:text-red-400 hover:underline"
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
          {filteredUsers.length === 0 && (
            <p className="mt-4 text-sm text-gray-500">No users match "{userSearch}".</p>
          )}
          {ROLE_SECTIONS.map(({ role, label }) => {
            const roleUsers = filteredUsers.filter((u) => u.role === role)
            if (roleUsers.length === 0) return null
            return (
              <div key={role} className="mt-6">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {label} <span className="font-normal text-gray-400">({roleUsers.length})</span>
                </h2>
                <UserTable users={roleUsers} auctions={auctions} auctionNameById={auctionNameById} />
              </div>
            )
          })}
        </section>
      </div>
    </Layout>
  )
}
