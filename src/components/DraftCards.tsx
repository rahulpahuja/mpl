import { playerById } from '../lib/draftMatches'
import { Avatar } from './Avatar'
import { DRAFT_TEAM_STYLES } from './draftTeamStyles'
import type { DraftMatchPlayer, DraftMatchTeam } from '../types'

// Runs a draft write and surfaces any failure on the page (see pages/DraftMatch.tsx).
export type DraftRun = (action: () => Promise<unknown>) => void

// Used in the lobby (tap to make someone Captain 1/2) and the draft pool (tap
// to draft) — captainBadge/onClick switch between the two.
export function DraftPlayerCard({
  player,
  captainBadge,
  onClick,
}: {
  player: DraftMatchPlayer
  captainBadge?: number | null
  onClick?: () => void
}) {
  const style = captainBadge ? DRAFT_TEAM_STYLES[captainBadge - 1] : null
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`surface-inset relative flex w-full flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-center transition enabled:hover:bg-white/70 enabled:dark:hover:bg-white/10 ${
        style ? `ring-2 ${style.ring}` : ''
      }`}
    >
      <Avatar name={player.name} photoURL={player.photoURL} avatarId={player.avatarId} size={12} />
      <span className="w-full truncate text-xs font-medium text-gray-900 dark:text-gray-100">{player.name}</span>
      {style && (
        <span className={`absolute right-1.5 top-1.5 rounded-full px-1.5 text-[10px] font-bold text-white ${style.badge}`}>
          C{captainBadge}
        </span>
      )}
    </button>
  )
}

export function DraftTeamCard({
  team,
  teamIndex,
  players,
  active = false,
}: {
  team: DraftMatchTeam
  teamIndex: number
  players: DraftMatchPlayer[]
  active?: boolean
}) {
  const style = DRAFT_TEAM_STYLES[teamIndex]
  return (
    <div className={`glass-card p-4 ${active ? `ring-2 ${style.ring}` : ''}`}>
      <div className="relative z-[3]">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`truncate font-semibold ${style.text}`}>{team.name}</h3>
          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{team.playerIds.length} players</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {team.playerIds.map((id) => {
            const player = playerById(players, id)
            return (
              <li key={id} className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                <Avatar name={player.name} photoURL={player.photoURL} avatarId={player.avatarId} size={6} />
                <span className="truncate">{player.name}</span>
                {id === team.captainId && (
                  <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-bold text-white ${style.badge}`}>C</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
