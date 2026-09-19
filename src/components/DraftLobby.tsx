import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import {
  MIN_DRAFT_PLAYERS,
  addManualDraftPlayer,
  addRegisteredDraftPlayer,
  confirmDraftCaptains,
  joinDraftMatch,
  removeDraftPlayer,
  setDraftCaptains,
} from '../lib/draftMatches'
import { Avatar } from './Avatar'
import { DraftPlayerCard } from './DraftCards'
import type { DraftRun } from './DraftCards'
import type { AppUser, DraftMatch } from '../types'

// Rendered only for the host, so only they pay for the users-collection
// listener. Anyone signed in can be added to a casual match, not only the
// Player role (which is about being up for auction).
function ImportPlayers({ match, run }: { match: DraftMatch; run: DraftRun }) {
  const { users } = useUsers()
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const onRoster = new Set(match.players.map((p) => p.playerId))
  const candidates = users
    .filter((u) => !onRoster.has(u.uid))
    .filter(
      (u) =>
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.userCode?.toLowerCase().includes(q),
    )

  return (
    <div className="glass-card p-4">
      <div className="relative z-[3] space-y-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Import players ({candidates.length})</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone or user ID"
          aria-label="Search players"
          className="input-glass w-full rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {candidates.map((u) => (
            <li key={u.uid} className="flex items-center gap-2 rounded-lg surface-inset px-3 py-2">
              <Avatar name={u.displayName} photoURL={u.photoURL} avatarId={u.avatarId} filenPhotoId={u.filenPhotoId} size={7} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-900 dark:text-gray-100">{u.displayName}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</span>
              </span>
              <button
                type="button"
                onClick={() => run(() => addRegisteredDraftPlayer(match.matchId, u))}
                className="btn-glass shrink-0 rounded-lg border px-3 py-1 text-xs font-medium"
              >
                Add
              </button>
            </li>
          ))}
          {candidates.length === 0 && <li className="text-xs text-gray-500">No matching players.</li>}
        </ul>
      </div>
    </div>
  )
}

function AddManualPlayer({ matchId, run }: { matchId: string; run: DraftRun }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const inputClass = 'input-glass min-w-0 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100'

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    run(async () => {
      await addManualDraftPlayer(matchId, trimmed, phone.trim(), email.trim())
      setName('')
      setPhone('')
      setEmail('')
    })
  }

  return (
    <div className="glass-card p-4">
      <div className="relative z-[3] space-y-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add a new player</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No account needed — phone and email are optional and only help match them to their profile later.
        </p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" className={`${inputClass} w-full`} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" aria-label="Phone" className={inputClass} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Gmail (optional)" aria-label="Email" className={inputClass} />
        </div>
        <button type="button" onClick={handleAdd} disabled={!name.trim()} className="btn-brand rounded-lg px-4 py-2 text-sm font-medium">
          Add player
        </button>
      </div>
    </div>
  )
}

export function DraftLobby({ match, user, isHost, run }: { match: DraftMatch; user: AppUser; isHost: boolean; run: DraftRun }) {
  const [copied, setCopied] = useState(false)
  const enoughPlayers = match.players.length >= MIN_DRAFT_PLAYERS
  const hasJoined = match.joinedUids.includes(user.uid)

  function toggleCaptain(playerId: string) {
    const current = match.captainIds
    const next = current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : current.length < 2
        ? [...current, playerId]
        : null
    if (next) run(() => setDraftCaptains(match.matchId, next))
  }

  function shuffleCaptains() {
    const ids = match.players.map((p) => p.playerId)
    const [first] = ids.splice(Math.floor(Math.random() * ids.length), 1)
    const second = ids[Math.floor(Math.random() * ids.length)]
    run(() => setDraftCaptains(match.matchId, [first, second]))
  }

  async function copyId() {
    await navigator.clipboard.writeText(match.matchId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        Match ID <span className="font-mono font-semibold tracking-widest text-gray-900 dark:text-gray-100">{match.matchId}</span>
        <button
          type="button"
          onClick={copyId}
          aria-label="Copy match ID"
          className="material-symbols-outlined rounded p-0.5 text-[16px] hover:bg-gray-200/60 dark:hover:bg-white/10"
        >
          {copied ? 'check' : 'content_copy'}
        </button>
        · share this so others can join
      </p>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        {match.players.length} players in the roster{isHost && ' · click two to make them Captains'}
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2.5">
        {match.players.map((p) => {
          const captainIndex = match.captainIds.indexOf(p.playerId)
          return (
            <div key={p.playerId} className="relative">
              <DraftPlayerCard
                player={p}
                captainBadge={captainIndex >= 0 ? captainIndex + 1 : null}
                onClick={isHost ? () => toggleCaptain(p.playerId) : undefined}
              />
              {isHost && p.uid !== match.hostUid && (
                <button
                  type="button"
                  onClick={() => run(() => removeDraftPlayer(match.matchId, p.playerId))}
                  aria-label={`Remove ${p.name}`}
                  className="material-symbols-outlined absolute left-1 top-1 rounded-full p-0.5 text-[14px] text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  close
                </button>
              )}
            </div>
          )
        })}
      </div>

      {!hasJoined && !isHost && (
        <button type="button" onClick={() => run(() => joinDraftMatch(match.matchId, user))} className="btn-brand w-full rounded-lg px-4 py-2.5 text-sm font-medium">
          Join this match
        </button>
      )}

      {!enoughPlayers && <p className="text-sm text-red-600 dark:text-red-400">Need at least {MIN_DRAFT_PLAYERS} players to start a draft.</p>}

      {isHost ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={shuffleCaptains}
              disabled={!enoughPlayers}
              className="btn-glass flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">casino</span>
              Shuffle Captains
            </button>
            <button
              type="button"
              onClick={() => run(() => confirmDraftCaptains(match.matchId))}
              disabled={!enoughPlayers || match.captainIds.length !== 2}
              className="btn-brand rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              Start Draft
            </button>
          </div>
          <ImportPlayers match={match} run={run} />
          <AddManualPlayer matchId={match.matchId} run={run} />
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {match.hostName || 'The host'} is setting up the roster — the draft starts once they pick two Captains.
        </p>
      )}
    </div>
  )
}
