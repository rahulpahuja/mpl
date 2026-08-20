import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import * as matchRules from './matchRules'
import { applyMatchToPlayerStats } from './playerStats'
import { recomputeStandings } from './tournaments'
import type { BallOutcome, DayNight, Match, MatchFormat, MatchTeamSide, TossDecision } from '../types'
import type { ScoreBallInput } from './matchRules'

function matchRef(matchId: string) {
  return doc(db, 'matches', matchId)
}

function ballsCol(matchId: string) {
  return collection(db, 'matches', matchId, 'balls')
}

function sideKeyFor(match: Match, teamId: string): 'teamA' | 'teamB' {
  return match.teamA.teamId === teamId ? 'teamA' : 'teamB'
}

export async function createMatch(input: {
  name: string
  format: MatchFormat
  tournamentId?: string | null
  tournamentName?: string | null
  dayNight: DayNight
  oversLimit: number
  venueId?: string | null
  venueName?: string | null
  teamA: Pick<MatchTeamSide, 'teamId' | 'teamName' | 'logoId' | 'logoImage' | 'jerseyColor'>
  teamB: Pick<MatchTeamSide, 'teamId' | 'teamName' | 'logoId' | 'logoImage' | 'jerseyColor'>
  createdBy: string
}): Promise<string> {
  const matchId = crypto.randomUUID()
  const side = (
    s: Pick<MatchTeamSide, 'teamId' | 'teamName' | 'logoId' | 'logoImage' | 'jerseyColor'>,
  ): MatchTeamSide => ({ ...s, playingXI: [], captainId: null, wicketKeeperId: null })

  const match: Omit<Match, 'createdAt'> = {
    matchId,
    name: input.name,
    format: input.format,
    tournamentId: input.tournamentId ?? null,
    tournamentName: input.tournamentName ?? null,
    dayNight: input.dayNight,
    oversLimit: input.oversLimit,
    venueId: input.venueId ?? null,
    venueName: input.venueName ?? null,
    status: 'setup',
    createdBy: input.createdBy,
    scheduledAt: null,
    teamA: side(input.teamA),
    teamB: side(input.teamB),
    toss: null,
    currentInnings: 1,
    innings1: null,
    innings2: null,
    result: null,
    winnerTeamId: null,
    scorerIds: [input.createdBy],
    lastBall: null,
  }
  await setDoc(matchRef(matchId), { ...match, createdAt: serverTimestamp() })
  return matchId
}

export async function deleteMatch(matchId: string) {
  await deleteDoc(matchRef(matchId))
}

export async function addScorer(matchId: string, uid: string) {
  const snap = await getDoc(matchRef(matchId))
  if (!snap.exists()) throw new Error('Match not found')
  const match = snap.data() as Match
  if (match.scorerIds.includes(uid)) return
  await updateDoc(matchRef(matchId), { scorerIds: [...match.scorerIds, uid] })
}

export async function removeScorer(matchId: string, uid: string) {
  const snap = await getDoc(matchRef(matchId))
  if (!snap.exists()) throw new Error('Match not found')
  const match = snap.data() as Match
  await updateDoc(matchRef(matchId), { scorerIds: match.scorerIds.filter((id) => id !== uid) })
}

export async function setPlayingXI(
  matchId: string,
  teamId: string,
  playingXI: string[],
  captainId: string | null,
  wicketKeeperId: string | null,
) {
  if (playingXI.length !== 11) throw new Error('A Playing XI needs exactly 11 players')
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId))
    if (!snap.exists()) throw new Error('Match not found')
    const match = snap.data() as Match
    if (match.status !== 'setup' && match.status !== 'toss') {
      throw new Error('Playing XI can only be changed before the toss')
    }
    const sideKey = sideKeyFor(match, teamId)
    const updatedSide: MatchTeamSide = { ...match[sideKey], playingXI, captainId, wicketKeeperId }
    const teamA = sideKey === 'teamA' ? updatedSide : match.teamA
    const teamB = sideKey === 'teamB' ? updatedSide : match.teamB
    const bothSet = teamA.playingXI.length === 11 && teamB.playingXI.length === 11
    tx.update(matchRef(matchId), { teamA, teamB, status: bothSet ? 'toss' : 'setup' })
  })
}

export async function recordToss(matchId: string, wonByTeamId: string, decision: TossDecision) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId))
    if (!snap.exists()) throw new Error('Match not found')
    const match = snap.data() as Match
    if (match.status !== 'toss') throw new Error('Set both Playing XIs before recording the toss')
    const battingTeamId = decision === 'bat' ? wonByTeamId : match.teamA.teamId === wonByTeamId ? match.teamB.teamId : match.teamA.teamId
    const bowlingTeamId = battingTeamId === match.teamA.teamId ? match.teamB.teamId : match.teamA.teamId
    const innings1 = matchRules.startInnings(battingTeamId, bowlingTeamId, 1, null)
    tx.update(matchRef(matchId), {
      toss: { wonByTeamId, decision },
      innings1,
      currentInnings: 1,
      status: 'live',
    })
  })
}

function activeInningsKey(match: Match): 'innings1' | 'innings2' {
  return match.currentInnings === 1 ? 'innings1' : 'innings2'
}

export async function pickBatsman(matchId: string, playerId: string, name: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId))
    if (!snap.exists()) throw new Error('Match not found')
    const match = snap.data() as Match
    const key = activeInningsKey(match)
    const innings = match[key]
    if (!innings) throw new Error('Innings has not started yet')
    const updated = matchRules.setNextBatsman(innings, { playerId, name })
    tx.update(matchRef(matchId), { [key]: updated })
  })
}

export async function pickBowler(matchId: string, playerId: string, name: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId))
    if (!snap.exists()) throw new Error('Match not found')
    const match = snap.data() as Match
    const key = activeInningsKey(match)
    const innings = match[key]
    if (!innings) throw new Error('Innings has not started yet')
    const updated = matchRules.setNextBowler(innings, { playerId, name })
    tx.update(matchRef(matchId), { [key]: updated })
  })
}

export async function recordBall(matchId: string, input: ScoreBallInput) {
  const completedMatch = await runTransaction<Match | null>(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId))
    if (!snap.exists()) throw new Error('Match not found')
    const match = snap.data() as Match
    const key = activeInningsKey(match)
    const innings = match[key]
    if (!innings) throw new Error('Innings has not started yet')

    const preBallInnings = innings
    const preBallStatus = match.status
    const { innings: updatedInnings, ball, inningsCompleted } = matchRules.recordBall(
      innings,
      match.oversLimit,
      10,
      input,
    )

    const ballSeq = (match.lastBall?.ballSeq ?? 0) + 1
    const ballDoc = doc(ballsCol(matchId))
    tx.set(ballDoc, { ...ball, timestamp: serverTimestamp() })

    const isBoundary: 4 | 6 | null = ball.runs === 4 ? 4 : ball.runs === 6 ? 6 : null
    const lastBall = { runs: ball.runs, extraType: ball.extraType, isWicket: ball.isWicket, isBoundary, ballSeq }

    let status: Match['status'] = preBallStatus
    let result: string | null = match.result ?? null
    let winnerTeamId: string | null = match.winnerTeamId ?? null

    if (inningsCompleted) {
      if (match.currentInnings === 1) {
        status = 'inningsBreak'
      } else {
        status = 'completed'
        const computed = matchRules.computeMatchResult({ ...match, [key]: updatedInnings })
        result = computed.result
        winnerTeamId = computed.winnerTeamId
      }
    }

    tx.update(matchRef(matchId), {
      [key]: updatedInnings,
      lastBall,
      status,
      result,
      winnerTeamId,
      undoSnapshot: {
        key,
        innings: preBallInnings,
        status: preBallStatus,
        ballDocPath: ballDoc.path,
      },
    })

    return status === 'completed'
      ? ({ ...match, [key]: updatedInnings, status, result, winnerTeamId } as Match)
      : null
  })

  if (completedMatch) {
    await applyMatchToPlayerStats(completedMatch)
    if (completedMatch.tournamentId) await recomputeStandings(completedMatch.tournamentId)
  }
}

export async function undoLastBall(matchId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId))
    if (!snap.exists()) throw new Error('Match not found')
    const match = snap.data() as Match & {
      undoSnapshot?: { key: 'innings1' | 'innings2'; innings: Match['innings1']; status: Match['status']; ballDocPath: string } | null
    }
    const undo = match.undoSnapshot
    if (!undo) throw new Error('Nothing to undo')
    // Note: if the ball being undone was the one that completed the match,
    // playerStats/tournament standings were already updated by recordBall's
    // post-transaction side effects and are NOT rolled back here — MatchScorer
    // redirects away to the read-only scorecard the instant status flips to
    // 'completed', so this path isn't reachable through the normal UI, but a
    // direct undoLastBall call after completion would leave stats stale.
    tx.delete(doc(db, undo.ballDocPath))
    tx.update(matchRef(matchId), {
      [undo.key]: undo.innings,
      status: undo.status,
      result: undo.status === 'completed' ? match.result : null,
      winnerTeamId: undo.status === 'completed' ? match.winnerTeamId : null,
      undoSnapshot: null,
    })
  })
}

export async function startSecondInnings(matchId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId))
    if (!snap.exists()) throw new Error('Match not found')
    const match = snap.data() as Match
    if (match.status !== 'inningsBreak' || !match.innings1) throw new Error('First innings is not finished yet')
    const battingTeamId = match.innings1.bowlingTeamId
    const bowlingTeamId = match.innings1.battingTeamId
    const target = match.innings1.totalRuns + 1
    const innings2 = matchRules.startInnings(battingTeamId, bowlingTeamId, 2, target)
    tx.update(matchRef(matchId), { innings2, currentInnings: 2, status: 'live', undoSnapshot: null })
  })
}

export async function abandonMatch(matchId: string, reason: string) {
  await updateDoc(matchRef(matchId), { status: 'abandoned', result: reason })
}

export async function listBalls(matchId: string, inningsNumber: 1 | 2): Promise<BallOutcome[]> {
  const snap = await getDocs(query(ballsCol(matchId), orderBy('timestamp', 'asc')))
  return snap.docs
    .map((d) => d.data() as BallOutcome)
    .filter((b) => b.inningsNumber === inningsNumber)
}
