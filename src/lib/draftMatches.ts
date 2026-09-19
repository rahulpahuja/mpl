import { Timestamp, deleteDoc, doc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import type { Transaction } from 'firebase/firestore'
import { db } from './firebase'
import { generateShortId } from './shortId'
import type { AppUser, DraftMatch, DraftMatchPlayer, DraftMatchStatus, DraftMatchTeam, RosterPlayer } from '../types'

// Web port of the Android app's DraftMatchRepository — same document shape
// and the same transactions, so a Team Draft can be run from a phone and a
// browser at once. A host creates a match (short shareable ID), others join,
// the host builds the roster and picks two captains, and the captains (or
// the host, standing in for anyone not on their own device) alternate picks
// until everyone is on a team. Turn order and pick legality are enforced
// here, not in firestore.rules, like bid amounts for auctions.

export const MIN_DRAFT_PLAYERS = 4
const DEFAULT_TURN_SECONDS = 15

function matchRef(matchId: string) {
  return doc(db, 'draftMatches', matchId)
}

// Falls back to a placeholder so a stale id never crashes a render.
export function playerById(players: DraftMatchPlayer[], id: string): DraftMatchPlayer {
  return players.find((p) => p.playerId === id) ?? { playerId: id, name: '?' }
}

function playerFromUser(user: AppUser): DraftMatchPlayer {
  return {
    playerId: user.uid,
    name: user.displayName,
    uid: user.uid,
    photoURL: user.photoURL ?? null,
    avatarId: user.avatarId ?? null,
    phone: null,
    email: null,
    role: user.playingRole ?? null,
  }
}

// Reads the live doc inside a transaction, then hands it to `mutate`, which
// either writes via tx.update or returns without writing (a no-op guard).
async function transact(matchId: string, mutate: (tx: Transaction, match: DraftMatch) => void) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId))
    if (!snap.exists()) throw new Error('Match not found')
    mutate(tx, snap.data() as DraftMatch)
  })
}

// The host joins their own match immediately — the common case is hosting
// your own pickup game.
export async function createDraftMatch(name: string, host: AppUser): Promise<string> {
  const matchId = generateShortId()
  const match: Omit<DraftMatch, 'createdAt'> = {
    matchId,
    name,
    hostUid: host.uid,
    hostName: host.displayName,
    status: 'lobby',
    players: [playerFromUser(host)],
    joinedUids: [host.uid],
    captainIds: [],
    teams: [],
    pool: [],
    turnIndex: 0,
    turnSeconds: DEFAULT_TURN_SECONDS,
    timerEndsAt: null,
    lastPick: null,
  }
  await setDoc(matchRef(matchId), { ...match, createdAt: serverTimestamp() })
  return matchId
}

export async function joinDraftMatch(matchId: string, user: AppUser) {
  await transact(matchId, (tx, match) => {
    if (match.joinedUids.includes(user.uid)) return
    // Someone the host already imported is on the roster but not yet in
    // joinedUids — joining just marks them joined instead of adding them twice.
    const onRoster = match.players.some((p) => p.playerId === user.uid)
    tx.update(matchRef(matchId), {
      joinedUids: [...match.joinedUids, user.uid],
      players: onRoster ? match.players : [...match.players, playerFromUser(user)],
    })
  })
}

async function addPlayer(matchId: string, player: DraftMatchPlayer) {
  await transact(matchId, (tx, match) => {
    if (match.players.some((p) => p.playerId === player.playerId)) return
    tx.update(matchRef(matchId), { players: [...match.players, player] })
  })
}

export async function addRegisteredDraftPlayer(matchId: string, user: AppUser) {
  await addPlayer(matchId, playerFromUser(user))
}

export async function addManualDraftPlayer(matchId: string, name: string, phone: string, email: string) {
  await addPlayer(matchId, {
    playerId: crypto.randomUUID(),
    name,
    uid: null,
    photoURL: null,
    avatarId: null,
    phone: phone || null,
    email: email || null,
    role: null,
  })
}

// Lobby-only cleanup: drop someone who can't play after all.
export async function removeDraftPlayer(matchId: string, playerId: string) {
  await transact(matchId, (tx, match) => {
    tx.update(matchRef(matchId), {
      players: match.players.filter((p) => p.playerId !== playerId),
      joinedUids: match.joinedUids.filter((uid) => uid !== playerId),
      captainIds: match.captainIds.filter((id) => id !== playerId),
    })
  })
}

export async function setDraftCaptains(matchId: string, captainIds: string[]) {
  await updateDoc(matchRef(matchId), { captainIds })
}

// Captains with an account are marked joined too — firestore.rules only lets
// joined users write, and an imported captain may never have clicked Join.
export async function confirmDraftCaptains(matchId: string) {
  await transact(matchId, (tx, match) => {
    const captainUids = match.captainIds
      .map((id) => match.players.find((p) => p.playerId === id)?.uid)
      .filter((uid): uid is string => !!uid && !match.joinedUids.includes(uid))
    tx.update(matchRef(matchId), {
      status: 'captainReveal' satisfies DraftMatchStatus,
      joinedUids: [...match.joinedUids, ...captainUids],
    })
  })
}

// Host-only per firestore.rules (isDraftHost).
export async function deleteDraftMatch(matchId: string) {
  await deleteDoc(matchRef(matchId))
}

function turnDeadline(turnSeconds: number) {
  return Timestamp.fromMillis(Date.now() + turnSeconds * 1000)
}

// Called by every client once its own captain-reveal animation finishes —
// the status guard makes every call after the first a no-op.
export async function beginDrafting(matchId: string) {
  await transact(matchId, (tx, match) => {
    if (match.status !== 'captainReveal' || match.captainIds.length !== 2) return
    const teams: DraftMatchTeam[] = match.captainIds.map((captainId) => {
      const captain = match.players.find((p) => p.playerId === captainId)
      return { captainId, name: `Team ${captain?.name ?? ''}`, playerIds: [captainId] }
    })
    tx.update(matchRef(matchId), {
      status: 'drafting' satisfies DraftMatchStatus,
      teams,
      pool: match.players.map((p) => p.playerId).filter((id) => !match.captainIds.includes(id)),
      turnIndex: 0,
      timerEndsAt: turnDeadline(match.turnSeconds),
    })
  })
}

function applyPick(tx: Transaction, matchId: string, match: DraftMatch, playerId: string, auto: boolean) {
  const teamIndex = match.turnIndex
  const pool = match.pool.filter((id) => id !== playerId)
  const done = pool.length === 0
  tx.update(matchRef(matchId), {
    teams: match.teams.map((t, i) => (i === teamIndex ? { ...t, playerIds: [...t.playerIds, playerId] } : t)),
    pool,
    turnIndex: done ? teamIndex : 1 - teamIndex,
    status: (done ? 'complete' : 'drafting') satisfies DraftMatchStatus,
    timerEndsAt: done ? null : turnDeadline(match.turnSeconds),
    lastPick: { playerId, teamIndex, auto, at: Date.now() },
  })
}

export async function pickDraftPlayer(matchId: string, playerId: string) {
  await transact(matchId, (tx, match) => {
    if (match.status !== 'drafting' || !match.pool.includes(playerId)) return
    applyPick(tx, matchId, match, playerId, false)
  })
}

// Any client may call this once it sees the deadline pass — the transaction
// re-reads the live doc, so if two clients race only the first moves the turn.
export async function autoPickIfExpired(matchId: string) {
  await transact(matchId, (tx, match) => {
    if (match.status !== 'drafting' || !match.timerEndsAt || match.timerEndsAt.toMillis() > Date.now()) return
    if (match.pool.length === 0) return
    applyPick(tx, matchId, match, match.pool[Math.floor(Math.random() * match.pool.length)], true)
  })
}

function toRosterPlayer(p: DraftMatchPlayer): RosterPlayer {
  return {
    playerId: p.playerId,
    name: p.name,
    isRegisteredUser: !!p.uid,
    playingRole: p.role ?? null,
    avatarId: p.avatarId ?? null,
    photoURL: p.photoURL ?? null,
  }
}

// A match started from a draft on the Android app uses each draft captain's
// id as its side's teamId — this maps such a side back to its drafted players.
export function draftSideRoster(draft: DraftMatch, teamId: string): RosterPlayer[] {
  const team = draft.teams.find((t) => t.captainId === teamId)
  return team ? team.playerIds.map((id) => toRosterPlayer(playerById(draft.players, id))) : []
}
