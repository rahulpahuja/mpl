import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useDraftMatchesList } from '../hooks/useDraftMatchesList'
import { useMatchesList } from '../hooks/useMatchesList'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePlainBackdrop } from '../hooks/usePlainBackdrop'
import { createDraftMatch, deleteDraftMatch } from '../lib/draftMatches'
import { useAuthStore } from '../store/authStore'
import type { DraftMatch, DraftMatchStatus } from '../types'

// Colour per draft stage, matching the Android Matches tab.
const DRAFT_STATUS_PILLS: Record<DraftMatchStatus, { label: string; className: string }> = {
  lobby: { label: 'lobby', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  captainReveal: { label: 'captains', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  drafting: { label: 'drafting', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  complete: { label: 'teams ready', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

function defaultMatchName(): string {
  const stamp = new Date().toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  return `Match · ${stamp}`
}

// Web entry point for the Team Draft flow the Android app has on its Matches
// tab: browse drafts still forming teams, start a new one, or join by ID.
export function DraftMatches() {
  usePageTitle('Team Draft')
  usePlainBackdrop()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)!
  const { matches, loading } = useDraftMatchesList()
  const { matches: liveMatches } = useMatchesList()
  const [name, setName] = useState(defaultMatchName)
  const [joinId, setJoinId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A finished draft stays listed ("teams ready") until its live match
  // exists — same rule as the Android list.
  const started = new Set(liveMatches.map((m) => m.matchId))
  const open = matches.filter((m) => m.status !== 'complete' || !started.has(m.matchId))

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    setError(null)
    try {
      navigate(`/draft/${await createDraftMatch(trimmed, user)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that match")
      setCreating(false)
    }
  }

  async function handleDelete(match: DraftMatch) {
    if (!confirm(`Delete "${match.name}"? This removes the match and its roster for everyone.`)) return
    try {
      await deleteDraftMatch(match.matchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that match")
    }
  }

  function handleJoin() {
    const id = joinId.trim().toUpperCase()
    if (id) navigate(`/draft/${id}`)
  }

  return (
    <Layout>
      <div className="apex-arena space-y-4">
        <div>
          <h1 className="aa-head text-2xl text-gray-900 dark:text-gray-100">Team Draft</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pick two Captains and draft the rest live with anyone who joins — from the app or the web.
          </p>
        </div>

        <div className="glass-card flex flex-wrap gap-2 p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Match name"
            aria-label="Match name"
            className="input-glass relative z-[3] min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="btn-brand relative z-[3] rounded-lg px-4 py-2 text-sm font-medium"
          >
            {creating ? 'Starting...' : 'Start a match'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading matches...</p>
        ) : open.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No matches are open right now — start one above.</p>
        ) : (
          <ul className="space-y-2">
            {open.map((m) => (
              <li key={m.matchId} className="glass-card glass-card-hoverable flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => navigate(`/draft/${m.matchId}`)}
                  className="relative z-[3] min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-medium text-gray-900 dark:text-gray-100">{m.name}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {m.players.length} players · hosted by {m.hostName} · {m.matchId}
                  </span>
                </button>
                <span
                  className={`relative z-[3] shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DRAFT_STATUS_PILLS[m.status].className}`}
                >
                  {DRAFT_STATUS_PILLS[m.status].label}
                </span>
                {m.hostUid === user.uid && (
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    aria-label={`Delete ${m.name}`}
                    className="material-symbols-outlined relative z-[3] shrink-0 rounded-md p-1 text-[18px] text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="glass-card p-4">
          <div className="relative z-[3] space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Join by match ID</p>
            <div className="flex gap-2">
              <input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="e.g. A1B2C3"
                aria-label="Match ID"
                className="input-glass min-w-0 flex-1 rounded-lg px-3 py-2 text-sm uppercase tracking-widest text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={!joinId.trim()}
                className="btn-glass rounded-lg border px-4 py-2 text-sm font-medium"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
