import { useEffect, useRef, useState } from 'react'
import { autoPickIfExpired, pickDraftPlayer, playerById } from '../lib/draftMatches'
import { DraftPlayerCard, DraftTeamCard } from './DraftCards'
import { DRAFT_TEAM_STYLES } from './draftTeamStyles'
import type { DraftRun } from './DraftCards'
import type { DraftMatch } from '../types'

const TICK_MS = 400
const TOAST_MS = 1100

// The live pick screen. The countdown is derived per device from the shared
// timerEndsAt (not pushed by anyone), so a backgrounded tab catches up on
// return. When it hits zero, any open client asks for an auto-pick — the
// transaction makes that safe to race.
export function DraftBoard({ match, canPick, run }: { match: DraftMatch; canPick: boolean; run: DraftRun }) {
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState<string | null>(null)
  const autoPickRequestedFor = useRef<number | null>(null)
  const seenPickAt = useRef(match.lastPick?.at)

  const deadline = match.timerEndsAt?.toMillis() ?? null
  const secondsLeft = deadline == null ? match.turnSeconds : Math.max(0, Math.ceil((deadline - now) / 1000))

  useEffect(() => {
    if (deadline == null) return
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [deadline])

  useEffect(() => {
    if (deadline == null || now < deadline || autoPickRequestedFor.current === deadline) return
    autoPickRequestedFor.current = deadline
    autoPickIfExpired(match.matchId).catch((err) => console.error('autoPickIfExpired failed', err))
  }, [now, deadline, match.matchId])

  // Toast each new pick (but not whatever pick was already there on load).
  const pick = match.lastPick
  useEffect(() => {
    if (!pick || pick.at === seenPickAt.current) return
    seenPickAt.current = pick.at
    const player = playerById(match.players, pick.playerId)
    setToast(`${player.name} joins ${match.teams[pick.teamIndex]?.name ?? ''}${pick.auto ? ' (auto-picked)' : ''}`)
    const id = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick?.at])

  if (match.teams.length < 2) return null
  const turnTeam = match.teams[match.turnIndex]
  const turnStyle = DRAFT_TEAM_STYLES[match.turnIndex]
  const drafted = match.teams.reduce((n, t) => n + t.playerIds.length - 1, 0)
  const total = drafted + match.pool.length

  return (
    <div className="space-y-4">
      {toast && (
        <div role="status" className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-black/85 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="glass-card p-4">
        <div className="relative z-[3] space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
              <span className={turnStyle.text}>{turnTeam.name}</span>'s pick
            </p>
            <span className={`shrink-0 font-mono text-2xl font-bold ${secondsLeft <= 5 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
              {secondsLeft}s
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className={`h-full transition-[width] duration-300 ${turnStyle.badge}`}
              style={{ width: `${(secondsLeft / match.turnSeconds) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {drafted} of {total} drafted · {canPick ? 'your pick — click a player below' : 'waiting for the captain to pick'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {match.teams.map((team, i) => (
          <DraftTeamCard key={team.captainId} team={team} teamIndex={i} players={match.players} active={match.turnIndex === i} />
        ))}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Available players</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2.5">
          {match.pool.map((id) => (
            <DraftPlayerCard
              key={id}
              player={playerById(match.players, id)}
              onClick={canPick ? () => run(() => pickDraftPlayer(match.matchId, id)) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
