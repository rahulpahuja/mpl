import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { useUsers } from '../hooks/useUsers'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { createTeam } from '../lib/teams'

export function AdminTeams() {
  const { users } = useUsers()
  const { teams } = useTeamsRegistry()

  const [teamName, setTeamName] = useState('')
  const [managerSearch, setManagerSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

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
      <div className="space-y-6">
        <AdminNav />
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Teams</h1>
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
                  No "Team Manager" users match. Promote someone to Team Manager from the Users
                  page first.
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
      </div>
    </Layout>
  )
}
