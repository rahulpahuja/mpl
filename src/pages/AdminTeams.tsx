import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { useUsers } from '../hooks/useUsers'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { usePageTitle } from '../hooks/usePageTitle'
import { createTeam, updateTeam } from '../lib/teams'
import type { AppUser } from '../types'

function managerMatches(candidates: AppUser[], search: string) {
  const q = search.trim().toLowerCase()
  return candidates.filter(
    (u) =>
      !q ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone?.includes(q),
  )
}

function ManagerPicker({
  candidates,
  search,
  onSearchChange,
  onSelect,
}: {
  candidates: AppUser[]
  search: string
  onSearchChange: (value: string) => void
  onSelect: (manager: AppUser) => void
}) {
  return (
    <>
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search manager by name, email, phone..."
        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
      />
      {search && (
        <ul className="mt-2 max-h-40 divide-y divide-gray-200 dark:divide-gray-800 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
          {candidates.map((m) => (
            <li key={m.uid}>
              <button
                type="button"
                onClick={() => onSelect(m)}
                className="block w-full px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {m.displayName} <span className="text-gray-500">— {m.phone || m.email}</span>
              </button>
            </li>
          ))}
          {candidates.length === 0 && (
            <li className="px-3 py-2 text-gray-500">
              No "Team Manager" users match. Promote someone to Team Manager from the Users page
              first.
            </li>
          )}
        </ul>
      )}
    </>
  )
}

export function AdminTeams() {
  usePageTitle('Teams')
  const { users } = useUsers()
  const { teams } = useTeamsRegistry()
  const teamManagerUsers = users.filter((u) => u.role === 'manager')

  const [teamName, setTeamName] = useState('')
  const [managerSearch, setManagerSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editManagerSearch, setEditManagerSearch] = useState('')
  const [editManagerId, setEditManagerId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

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

  function startEdit(teamId: string, currentName: string, currentManagerId: string) {
    setEditingTeamId(teamId)
    setEditName(currentName)
    setEditManagerId(currentManagerId)
    setEditManagerSearch('')
  }

  async function handleSaveEdit(teamId: string) {
    if (!editName.trim()) return
    const manager = users.find((u) => u.uid === editManagerId)
    setSavingEdit(true)
    try {
      await updateTeam(teamId, {
        teamName: editName.trim(),
        ...(manager ? { managerId: manager.uid, managerName: manager.displayName } : {}),
      })
      setEditingTeamId(null)
    } finally {
      setSavingEdit(false)
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
            auctions from that auction's Setup page. Rename a team or reassign its manager any
            time from the list below.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <div className="sm:col-span-2">
              <ManagerPicker
                candidates={managerMatches(teamManagerUsers, managerSearch)}
                search={managerSearch}
                onSearchChange={(value) => {
                  setManagerSearch(value)
                  setSelectedManagerId('')
                }}
                onSelect={(m) => {
                  setSelectedManagerId(m.uid)
                  setManagerSearch(`${m.displayName} (${m.phone || m.email})`)
                }}
              />
            </div>
            <button
              onClick={handleCreateTeam}
              disabled={creatingTeam || !teamName.trim() || !selectedManagerId}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 h-fit"
            >
              Create team
            </button>
          </div>

          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            {teams.map((t) => {
              const manager = users.find((u) => u.uid === t.managerId)
              const isEditing = editingTeamId === t.teamId

              if (isEditing) {
                return (
                  <li key={t.teamId} className="space-y-2 py-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                      />
                      <div className="sm:col-span-2">
                        <ManagerPicker
                          candidates={managerMatches(teamManagerUsers, editManagerSearch)}
                          search={editManagerSearch}
                          onSearchChange={setEditManagerSearch}
                          onSelect={(m) => {
                            setEditManagerId(m.uid)
                            setEditManagerSearch(`${m.displayName} (${m.phone || m.email})`)
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(t.teamId)}
                        disabled={savingEdit || !editName.trim()}
                        className="rounded-md bg-gray-800 dark:bg-gray-200 px-3 py-1 text-xs font-medium text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
                      >
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingTeamId(null)}
                        disabled={savingEdit}
                        className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                )
              }

              return (
                <li key={t.teamId} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-gray-900 dark:text-gray-100">{t.teamName}</span>
                  <span className="flex items-center gap-3 text-gray-500">
                    Manager: {t.managerName}
                    <WhatsAppButton phone={manager?.whatsapp || manager?.phone} />
                    <button
                      onClick={() => startEdit(t.teamId, t.teamName, t.managerId)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Edit
                    </button>
                  </span>
                </li>
              )
            })}
            {teams.length === 0 && <li className="py-2 text-gray-500">No teams created yet.</li>}
          </ul>
        </section>
      </div>
    </Layout>
  )
}
