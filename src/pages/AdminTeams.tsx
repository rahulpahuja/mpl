import { useRef, useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { Avatar } from '../components/Avatar'
import { AvatarPicker } from '../components/AvatarPicker'
import { PlayerPicker } from '../components/PlayerPicker'
import { TeamAvatar } from '../components/TeamAvatar'
import { TeamLogoUpload } from '../components/TeamLogoUpload'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { useUsers } from '../hooks/useUsers'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { usePageTitle } from '../hooks/usePageTitle'
import { addToRoster, createTeam, removeFromRoster, updateTeam } from '../lib/teams'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'
import type { AppUser, RosterPlayer, Team } from '../types'

// Roster editor for one team — a search-and-add picker (registered users
// with role 'player', reusing PlayerPicker) plus a manual "add unregistered
// name" row, since a squad often includes people without an account. This is
// the pool src/pages/MatchSetup.tsx picks a Playing XI from.
function TeamRosterPanel({ team, allUsers }: { team: Team; allUsers: AppUser[] }) {
  const roster = team.roster ?? []
  const rosterIds = new Set(roster.map((p) => p.playerId))
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manualName, setManualName] = useState('')
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const addingIdsRef = useRef<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const candidates = allUsers.filter((u) => u.role === 'player' && !rosterIds.has(u.uid))

  async function handleAddRegistered(user: AppUser) {
    if (addingIdsRef.current.has(user.uid)) return
    addingIdsRef.current.add(user.uid)
    setAddingIds(new Set(addingIdsRef.current))
    setError(null)
    try {
      const player: RosterPlayer = {
        playerId: user.uid,
        name: user.displayName,
        isRegisteredUser: true,
        playingRole: user.playingRole ?? null,
        battingHandedness: user.battingHandedness ?? null,
        bowlingHandedness: user.bowlingHandedness ?? null,
        battingType: user.battingType ?? null,
        bowlingType: user.bowlingType ?? null,
        avatarId: user.avatarId ?? null,
        photoURL: user.photoURL ?? null,
        encryptedPhoto: user.encryptedPhoto ?? null,
      }
      await addToRoster(team.teamId, player)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player')
    } finally {
      addingIdsRef.current.delete(user.uid)
      setAddingIds(new Set(addingIdsRef.current))
    }
  }

  async function handleAddManual() {
    const name = manualName.trim()
    if (!name) return
    setError(null)
    try {
      const player: RosterPlayer = {
        playerId: crypto.randomUUID(),
        name,
        isRegisteredUser: false,
        avatarId: null,
        photoURL: null,
        encryptedPhoto: null,
      }
      await addToRoster(team.teamId, player)
      setManualName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player')
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Roster ({roster.length}) — the pool matches pick a Playing XI from
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="shrink-0 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Add player
        </button>
      </div>

      {roster.length > 0 && (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {roster.map((p) => (
            <li
              key={p.playerId}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm dark:bg-gray-800"
            >
              <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                <Avatar name={p.name} avatarId={p.avatarId} photoURL={p.photoURL} encryptedPhoto={p.encryptedPhoto} />
                <span className="min-w-0 truncate">
                  {p.name}
                  {p.playingRole && (
                    <span className="ml-1.5 text-xs text-gray-500">{PLAYING_ROLE_LABELS[p.playingRole]}</span>
                  )}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFromRoster(team.teamId, p)}
                className="shrink-0 text-xs text-gray-400 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {roster.length === 0 && <p className="text-sm text-gray-400">No players on this roster yet.</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="Add an unregistered player by name..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={handleAddManual}
          disabled={!manualName.trim()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Add unregistered player
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <PlayerPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={`Add to ${team.teamName}'s roster`}
        description="Search registered users with the Player role."
        candidates={candidates}
        search={search}
        onSearchChange={setSearch}
        mode="add"
        onAdd={handleAddRegistered}
        addingIds={addingIds}
      />
    </div>
  )
}

const DEFAULT_JERSEY_COLOR = '#dc2626'
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

// The jersey color field accepts either a hex value from the color picker
// (always valid, 7 chars) or free text typed by hand (e.g. "Maroon") — only
// the latter needs a minimum-length check.
function isValidJerseyColorText(value: string) {
  return value === '' || HEX_COLOR_PATTERN.test(value) || value.trim().length >= 3
}

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
                  filenPhotoId={m.filenPhotoId}
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
              No "Captain" users match. Promote someone to Captain from the Users page
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
  const [teamJerseyColorError, setTeamJerseyColorError] = useState<string | null>(null)
  const [managerSearch, setManagerSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

  const [expandedRosterTeamId, setExpandedRosterTeamId] = useState<string | null>(null)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editLogoId, setEditLogoId] = useState<string | null>(null)
  const [editLogoImage, setEditLogoImage] = useState<string | null>(null)
  const [editJerseyColor, setEditJerseyColor] = useState(DEFAULT_JERSEY_COLOR)
  const [editJerseyColorError, setEditJerseyColorError] = useState<string | null>(null)
  const [editManagerSearch, setEditManagerSearch] = useState('')
  const [editManagerId, setEditManagerId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  async function handleCreateTeam() {
    if (!teamName.trim() || !selectedManagerId) return
    if (!isValidJerseyColorText(teamJerseyColor)) {
      setTeamJerseyColorError('Type at least 3 characters, or use the color picker instead')
      return
    }
    setTeamJerseyColorError(null)
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
    setEditJerseyColorError(null)
    setEditingTeamId(teamId)
    setEditName(currentName)
    setEditManagerId(currentManagerId)
    setEditManagerSearch('')
  }

  async function handleSaveEdit(teamId: string) {
    if (!editName.trim()) return
    if (!isValidJerseyColorText(editJerseyColor)) {
      setEditJerseyColorError('Type at least 3 characters, or use the color picker instead')
      return
    }
    setEditJerseyColorError(null)
    const manager = users.find((u) => u.uid === editManagerId)
    setSavingEdit(true)
    try {
      await updateTeam(teamId, {
        teamName: editName.trim(),
        logoId: editLogoId,
        logoImage: editLogoImage,
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
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="new-team-jersey-color"
                  type="color"
                  value={HEX_COLOR_PATTERN.test(teamJerseyColor) ? teamJerseyColor : DEFAULT_JERSEY_COLOR}
                  onChange={(e) => {
                    setTeamJerseyColor(e.target.value)
                    setTeamJerseyColorError(null)
                  }}
                  disabled={creatingTeam}
                  className="block h-9 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
                />
                <input
                  type="text"
                  value={teamJerseyColor}
                  onChange={(e) => {
                    setTeamJerseyColor(e.target.value)
                    setTeamJerseyColorError(null)
                  }}
                  placeholder="or type e.g. Maroon"
                  minLength={3}
                  disabled={creatingTeam}
                  className="h-9 w-36 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                />
              </div>
              {teamJerseyColorError && (
                <p className="mt-1 text-xs text-red-600">{teamJerseyColorError}</p>
              )}
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
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            id={`edit-team-jersey-color-${t.teamId}`}
                            type="color"
                            value={HEX_COLOR_PATTERN.test(editJerseyColor) ? editJerseyColor : DEFAULT_JERSEY_COLOR}
                            onChange={(e) => {
                              setEditJerseyColor(e.target.value)
                              setEditJerseyColorError(null)
                            }}
                            disabled={savingEdit}
                            className="block h-9 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
                          />
                          <input
                            type="text"
                            value={editJerseyColor}
                            onChange={(e) => {
                              setEditJerseyColor(e.target.value)
                              setEditJerseyColorError(null)
                            }}
                            placeholder="or type e.g. Maroon"
                            minLength={3}
                            disabled={savingEdit}
                            className="h-9 w-36 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                          />
                        </div>
                        {editJerseyColorError && (
                          <p className="mt-1 text-xs text-red-600">{editJerseyColorError}</p>
                        )}
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

              const rosterOpen = expandedRosterTeamId === t.teamId
              return (
                <li key={t.teamId} className="py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                      <TeamAvatar
                        teamName={t.teamName}
                        logoId={t.logoId}
                        logoImage={t.logoImage}
                        jerseyColor={t.jerseyColor}
                      />
                      <span className="truncate">{t.teamName}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-3 text-gray-500">
                      <span className="truncate">Manager: {t.managerName}</span>
                      <WhatsAppButton phone={manager?.whatsapp || manager?.phone} />
                      <button
                        onClick={() => setExpandedRosterTeamId(rosterOpen ? null : t.teamId)}
                        className="shrink-0 text-red-600 dark:text-red-400 hover:underline"
                      >
                        {rosterOpen ? 'Hide roster' : `Roster (${t.roster?.length ?? 0})`}
                      </button>
                      <button
                        onClick={() =>
                          startEdit(t.teamId, t.teamName, t.managerId, t.logoId, t.logoImage, t.jerseyColor)
                        }
                        className="shrink-0 text-red-600 dark:text-red-400 hover:underline"
                      >
                        Edit
                      </button>
                    </span>
                  </div>
                  {rosterOpen && <TeamRosterPanel team={t} allUsers={users} />}
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
