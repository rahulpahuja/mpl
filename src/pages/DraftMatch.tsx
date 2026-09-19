import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DraftBoard } from '../components/DraftBoard'
import { DraftLobby } from '../components/DraftLobby'
import { DraftCaptainReveal, DraftTeamsReady } from '../components/DraftReveal'
import { Layout } from '../components/Layout'
import { useDraftMatch } from '../hooks/useDraftMatch'
import { usePageTitle } from '../hooks/usePageTitle'
import { useForcedDarkTheme } from '../hooks/useTimeBasedTheme'
import { useAuthStore } from '../store/authStore'
import type { DraftRun } from '../components/DraftCards'

// One Team Draft, live-synced with every other client (web or Android):
// lobby → captain reveal → drafting → teams ready.
export function DraftMatch() {
  const { matchId } = useParams<{ matchId: string }>()
  useForcedDarkTheme()
  const { match, loading } = useDraftMatch(matchId?.toUpperCase())
  const user = useAuthStore((s) => s.user)!
  const [error, setError] = useState<string | null>(null)
  usePageTitle(match ? `${match.name} · Team Draft` : 'Team Draft')

  const run: DraftRun = (action) => {
    setError(null)
    action().catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong'))
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-500">Loading...</p>
      </Layout>
    )
  }
  if (!match) {
    return (
      <Layout>
        <p className="text-gray-500">This match doesn't exist, or the link is wrong.</p>
      </Layout>
    )
  }

  const isHost = user.uid === match.hostUid
  // The host can always pick (standing in for a captain who isn't on a
  // device); the captain whose turn it is can pick for themselves.
  const turnCaptainUid = match.players.find((p) => p.playerId === match.teams[match.turnIndex]?.captainId)?.uid
  const canPick = isHost || (!!turnCaptainUid && turnCaptainUid === user.uid)

  return (
    <Layout>
      <div className="apex-arena space-y-4">
        <div className="flex items-center gap-2">
          <Link
            to="/draft"
            aria-label="Back to Team Draft"
            className="material-symbols-outlined rounded-md p-1 text-[20px] text-gray-500 hover:bg-gray-200/60 dark:hover:bg-white/10"
          >
            arrow_back
          </Link>
          <h1 className="aa-head min-w-0 truncate text-2xl text-gray-900 dark:text-gray-100">{match.name}</h1>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {match.status === 'lobby' && <DraftLobby match={match} user={user} isHost={isHost} run={run} />}
        {match.status === 'captainReveal' && <DraftCaptainReveal match={match} />}
        {match.status === 'drafting' && <DraftBoard match={match} canPick={canPick} run={run} />}
        {match.status === 'complete' && <DraftTeamsReady match={match} />}
      </div>
    </Layout>
  )
}
