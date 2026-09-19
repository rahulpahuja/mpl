import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMatch } from '../hooks/useMatch'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { runConfettiBurst } from '../lib/confettiEngine'
import { beginDrafting, playerById } from '../lib/draftMatches'
import { Avatar } from './Avatar'
import { DraftTeamCard } from './DraftCards'
import { DRAFT_TEAM_STYLES } from './draftTeamStyles'
import type { DraftMatch } from '../types'

// Same beats as the Android reveal: captain 1, "VS", captain 2, then draft.
const REVEAL_STEPS_MS = [150, 650, 1000]
const REVEAL_DONE_MS = 2200
const TEAMS_PALETTE = ['#2563eb', '#60a5fa', '#f97316', '#fdba74', '#ffffff']

function revealClass(shown: boolean) {
  return `transition duration-300 ${shown ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`
}

// Runs on every open client once the host confirms captains; each one calls
// beginDrafting when its own animation ends — the first call wins.
export function DraftCaptainReveal({ match }: { match: DraftMatch }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = REVEAL_STEPS_MS.map((ms, i) => setTimeout(() => setStep(i + 1), ms))
    timers.push(
      setTimeout(() => beginDrafting(match.matchId).catch((err) => console.error('beginDrafting failed', err)), REVEAL_DONE_MS),
    )
    return () => timers.forEach(clearTimeout)
  }, [match.matchId])

  const captains = match.captainIds.map((id) => playerById(match.players, id))
  const captainCard = (index: number) => {
    const captain = captains[index]
    if (!captain) return null
    return (
      <div className={`flex w-28 flex-col items-center gap-2 ${revealClass(step >= (index === 0 ? 1 : 3))}`}>
        <div className={`rounded-full ring-4 ${DRAFT_TEAM_STYLES[index].ring}`}>
          <Avatar name={captain.name} photoURL={captain.photoURL} avatarId={captain.avatarId} size={20} />
        </div>
        <span className="w-full truncate text-center font-semibold text-gray-900 dark:text-gray-100">{captain.name}</span>
        <span className={`text-xs font-bold uppercase ${DRAFT_TEAM_STYLES[index].text}`}>Captain {index + 1}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <p className="aa-label mb-8">The Captains</p>
      <div className="flex items-center gap-6">
        {captainCard(0)}
        <span className={`text-3xl font-black text-gray-900 dark:text-gray-100 ${revealClass(step >= 2)}`}>VS</span>
        {captainCard(1)}
      </div>
      <p className="mt-10 text-sm text-gray-500 dark:text-gray-400">Draft starting…</p>
    </div>
  )
}

// A draft started from a match's setup page hands its teams back to that
// match; otherwise live scoring is started from the Android app, and once it
// exists anyone on the web can follow it.
export function DraftTeamsReady({ match, isHost }: { match: DraftMatch; isHost: boolean }) {
  const reducedMotion = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { match: liveMatch } = useMatch(match.matchId)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reducedMotion) return
    return runConfettiBurst(canvas, { palette: TEAMS_PALETTE })
  }, [reducedMotion])

  return (
    <div className="space-y-6">
      {!reducedMotion && <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />}
      <h2 className="aa-head text-center text-3xl text-gray-900 dark:text-gray-100">Teams Ready!</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {match.teams.map((team, i) => (
          <DraftTeamCard key={team.captainId} team={team} teamIndex={i} players={match.players} />
        ))}
      </div>
      <div className="text-center">
        {match.linkedMatchId && !isHost ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">The organiser is setting these teams on the match.</p>
        ) : match.linkedMatchId ? (
          <Link to={`/admin/matches/${match.linkedMatchId}/setup`} className="btn-brand inline-block rounded-lg px-5 py-2.5 text-sm font-medium">
            Back to match setup
          </Link>
        ) : liveMatch ? (
          <Link to={`/watch/${match.matchId}`} className="btn-brand inline-block rounded-lg px-5 py-2.5 text-sm font-medium">
            Watch the match
          </Link>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The host starts live scoring from the MPL Android app — a Watch link appears here once it's underway.
          </p>
        )}
      </div>
    </div>
  )
}
