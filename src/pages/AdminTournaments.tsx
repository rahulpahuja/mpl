import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { TeamAvatar } from '../components/TeamAvatar'
import { useAuthStore } from '../store/authStore'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { useTournamentsList } from '../hooks/useTournamentsList'
import { usePageTitle } from '../hooks/usePageTitle'
import { addTeamToTournament, createTournament } from '../lib/tournaments'
import type { Team, TournamentStanding } from '../types'

function nrrLabel(nrr: number): string {
  const sign = nrr > 0 ? '+' : ''
  return `${sign}${nrr.toFixed(3)}`
}

function StandingsTable({ standings }: { standings: TournamentStanding[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="py-2 pr-2 font-medium">Team</th>
            <th className="py-2 pr-2 text-right font-medium">P</th>
            <th className="py-2 pr-2 text-right font-medium">W</th>
            <th className="py-2 pr-2 text-right font-medium">L</th>
            <th className="py-2 pr-2 text-right font-medium">T</th>
            <th className="py-2 pr-2 text-right font-medium">Pts</th>
            <th className="py-2 pr-2 text-right font-medium">NRR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {standings.map((s) => (
            <tr key={s.teamId}>
              <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">{s.teamName}</td>
              <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{s.played}</td>
              <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{s.won}</td>
              <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{s.lost}</td>
              <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{s.tied}</td>
              <td className="py-2 pr-2 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">{s.points}</td>
              <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">{nrrLabel(s.nrr)}</td>
            </tr>
          ))}
          {standings.length === 0 && (
            <tr>
              <td colSpan={7} className="py-3 text-gray-500">
                No teams yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function AddTeamRow({ tournamentId, teams, existingTeamIds }: { tournamentId: string; teams: Team[]; existingTeamIds: string[] }) {
  const [teamId, setTeamId] = useState('')
  const [adding, setAdding] = useState(false)
  const available = teams.filter((t) => !existingTeamIds.includes(t.teamId))

  async function handleAdd() {
    const team = available.find((t) => t.teamId === teamId)
    if (!team) return
    setAdding(true)
    try {
      await addTeamToTournament(tournamentId, { teamId: team.teamId, teamName: team.teamName })
      setTeamId('')
    } finally {
      setAdding(false)
    }
  }

  if (available.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select
        value={teamId}
        onChange={(e) => setTeamId(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="">Add a team...</option>
        {available.map((t) => (
          <option key={t.teamId} value={t.teamId}>
            {t.teamName}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={!teamId || adding}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {adding ? 'Adding...' : 'Add'}
      </button>
    </div>
  )
}

export function AdminTournaments() {
  usePageTitle('Tournaments')
  const user = useAuthStore((s) => s.user)
  const { teams } = useTeamsRegistry()
  const { tournaments, loading } = useTournamentsList()

  const [name, setName] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  async function handleCreate() {
    if (!user || !name.trim() || selectedTeamIds.size === 0) return
    setCreating(true)
    try {
      const selected = teams.filter((t) => selectedTeamIds.has(t.teamId))
      await createTournament(name.trim(), user.uid, selected)
      setName('')
      setSelectedTeamIds(new Set())
    } finally {
      setCreating(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Tournaments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Group matches together with a real points table (wins/losses/points, plus net run rate for
            tie-breaks). A match can also just stand alone as a friendly without any of this.
          </p>

          <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Create a tournament</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tournament name"
              className="mt-2 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Teams:</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {teams.map((t) => {
                const checked = selectedTeamIds.has(t.teamId)
                return (
                  <button
                    key={t.teamId}
                    type="button"
                    onClick={() => toggleTeam(t.teamId)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                      checked
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    <TeamAvatar teamName={t.teamName} logoId={t.logoId} logoImage={t.logoImage} jerseyColor={t.jerseyColor} size={6} />
                    <span className="max-w-[10rem] truncate">{t.teamName}</span>
                  </button>
                )
              })}
              {teams.length === 0 && <p className="text-sm text-gray-500">No teams created yet.</p>}
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || selectedTeamIds.size === 0}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create tournament'}
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {loading && <p className="text-sm text-gray-500">Loading tournaments...</p>}
            {tournaments.map((t) => {
              const expanded = expandedId === t.tournamentId
              return (
                <div key={t.tournamentId} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : t.tournamentId)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span className="min-w-0 truncate text-base font-medium text-gray-900 dark:text-gray-100">{t.name}</span>
                    <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                      {t.teamIds.length} team{t.teamIds.length === 1 ? '' : 's'} {expanded ? '▲' : '▼'}
                    </span>
                  </button>
                  {expanded && (
                    <div className="mt-4">
                      <StandingsTable standings={t.standings} />
                      <AddTeamRow tournamentId={t.tournamentId} teams={teams} existingTeamIds={t.teamIds} />
                    </div>
                  )}
                </div>
              )
            })}
            {!loading && tournaments.length === 0 && <p className="text-sm text-gray-500">No tournaments yet.</p>}
          </div>
        </section>
      </div>
    </Layout>
  )
}
