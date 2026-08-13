import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { Avatar } from '../components/Avatar'
import { AvatarPicker } from '../components/AvatarPicker'
import { TeamAvatar } from '../components/TeamAvatar'
import { TeamLogoUpload } from '../components/TeamLogoUpload'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { useUsers } from '../hooks/useUsers'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { usePageTitle } from '../hooks/usePageTitle'
import { createTeam, updateTeam } from '../lib/teams'
import type { AppUser } from '../types'

const DEFAULT_JERSEY_COLOR = '#dc2626'

function managerMatches(candidates: AppUser[], search: string) {
  const q = search.trim().toLowerCase()
  return candidates.filter(
    (u) =>
      !q ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.userCode?.toLowerCase().includes(q),
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
        placeholder="Search manager by name, email, phone, or ID..."
        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
      />
      {search && (
        <ul className="mt-2 max-h-40 divide-y divide-gray-200 dark:divide-gray-800 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
          {candidates.map((m) => (
            <li key={m.uid}>
              <button
                type="button"
                onClick={() => onSelect(m)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Avatar
                  name={m.displayName}
                  encryptedPhoto={m.encryptedPhoto}
                  photoURL={m.photoURL}
                  avatarId={m.avatarId}
                />
                <span className="min-w-0 break-words">
                  {m.displayName}{' '}
                  <span className="text-gray-500">
                    — {m.userCode ? `ID ${m.userCode} · ` : ''}
                    {m.phone || m.email}
                  </span>
                </span>
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
  const [teamLogoId, setTeamLogoId] = useState<string | null>(null)
  const [teamJerseyColor, setTeamJerseyColor] = useState(DEFAULT_JERSEY_COLOR)
  const [managerSearch, setManagerSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editLogoId, setEditLogoId] = useState<string | null>(null)
  const [editLogoImage, setEditLogoImage] = useState<string | null>(null)
  const [editJerseyColor, setEditJerseyColor] = useState(DEFAULT_JERSEY_COLOR)
  const [editManagerSearch, setEditManagerSearch] = useState('')
  const [editManagerId, setEditManagerId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  async function handleCreateTeam() {
    if (!teamName.trim() || !selectedManagerId) return
    const manager = users.find((u) => u.uid === selectedManagerId)
    if (!manager) return
    setCreatingTeam(true)
    try {
      await createTeam(teamName.trim(), manager.uid, manager.displayName, teamLogoId, teamJerseyColor)
      setTeamName('')
      setTeamLogoId(null)
      setTeamJerseyColor(DEFAULT_JERSEY_COLOR)
      setSelectedManagerId('')
      setManagerSearch('')
    } finally {
      setCreatingTeam(false)
    }
  }

  function startEdit(
    teamId: string,
    currentName: string,
    currentManagerId: string,
    currentLogoId: string | null | undefined,
    currentLogoImage: string | null | undefined,
    currentJerseyColor: string | null | undefined,
  ) {
    setEditLogoId(currentLogoId ?? null)
    setEditLogoImage(currentLogoImage ?? null)
    setEditJerseyColor(currentJerseyColor ?? DEFAULT_JERSEY_COLOR)
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
        logoId: editLogoId,
        jerseyColor: editJerseyColor,
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
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Team logo (optional):</p>
              <div className="mt-1.5">
                <AvatarPicker
                  selectedId={teamLogoId}
                  onSelect={(id) => setTeamLogoId((current) => (current === id ? null : id))}
                  disabled={creatingTeam}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Uploading a custom logo image is available once the team is created — edit it
                from the list below.
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="new-team-jersey-color">
                Jersey color:
              </label>
              <input
                id="new-team-jersey-color"
                type="color"
                value={teamJerseyColor}
                onChange={(e) => setTeamJerseyColor(e.target.value)}
                disabled={creatingTeam}
                className="mt-1.5 block h-9 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
              />
            </div>
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
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Team logo:</p>
                        <div className="mt-1.5">
                          <AvatarPicker
                            selectedId={editLogoId}
                            onSelect={(id) => {
                              setEditLogoId((current) => (current === id ? null : id))
                              setEditLogoImage(null)
                            }}
                            disabled={savingEdit}
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          className="text-xs text-gray-500 dark:text-gray-400"
                          htmlFor={`edit-team-jersey-color-${t.teamId}`}
                        >
                          Jersey color:
                        </label>
                        <input
                          id={`edit-team-jersey-color-${t.teamId}`}
                          type="color"
                          value={editJerseyColor}
                          onChange={(e) => setEditJerseyColor(e.target.value)}
                          disabled={savingEdit}
                          className="mt-1.5 block h-9 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Upload a custom logo image (overrides the preset above):
                      </p>
                      <div className="mt-1.5">
                        <TeamLogoUpload
                          teamId={t.teamId}
                          teamName={editName || t.teamName}
                          logoImage={editLogoImage}
                          onChange={(logoImage) => {
                            setEditLogoImage(logoImage)
                            if (logoImage) setEditLogoId(null)
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
                <li
                  key={t.teamId}
                  className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                    <TeamAvatar teamName={t.teamName} logoId={t.logoId} />
                    <span className="truncate">{t.teamName}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-3 text-gray-500">
                    <span className="truncate">Manager: {t.managerName}</span>
                    <WhatsAppButton phone={manager?.whatsapp || manager?.phone} />
                    <button
                      onClick={() => startEdit(t.teamId, t.teamName, t.managerId, t.logoId)}
                      className="shrink-0 text-red-600 dark:text-red-400 hover:underline"
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
