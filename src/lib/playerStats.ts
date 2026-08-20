import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { BatsmanInningsStat, BowlerInningsStat, Match, PlayerStats } from '../types'

function statsRef(playerId: string) {
  return doc(db, 'playerStats', playerId)
}

function zeroStats(playerId: string): Omit<PlayerStats, 'updatedAt'> {
  return {
    playerId,
    matchesPlayed: 0,
    batting: {
      innings: 0,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      notOuts: 0,
      highScore: 0,
      twentyFives: 0,
      fifties: 0,
      hundreds: 0,
      twoHundreds: 0,
      threeHundreds: 0,
      fourHundreds: 0,
    },
    bowling: {
      innings: 0,
      legalBalls: 0,
      runsConceded: 0,
      wickets: 0,
      maidens: 0,
      fours: 0,
      sixes: 0,
      bestWickets: 0,
      bestRuns: 0,
      threeWicketHauls: 0,
      fiveWicketHauls: 0,
      sevenWicketHauls: 0,
      tenWicketHauls: 0,
    },
    fielding: { catches: 0, runOuts: 0, stumpings: 0 },
    wicketKeeping: { dismissals: 0, stumpings: 0, catchesAsKeeper: 0 },
  }
}

function battingBand(runs: number): keyof PlayerStats['batting'] | null {
  if (runs >= 400) return 'fourHundreds'
  if (runs >= 300) return 'threeHundreds'
  if (runs >= 200) return 'twoHundreds'
  if (runs >= 100) return 'hundreds'
  if (runs >= 50) return 'fifties'
  if (runs >= 25) return 'twentyFives'
  return null
}

function bowlingHaulBand(wickets: number): keyof PlayerStats['bowling'] | null {
  if (wickets >= 10) return 'tenWicketHauls'
  if (wickets >= 7) return 'sevenWicketHauls'
  if (wickets >= 5) return 'fiveWicketHauls'
  if (wickets >= 3) return 'threeWicketHauls'
  return null
}

interface Contribution {
  batting?: BatsmanInningsStat
  bowling?: BowlerInningsStat
  catches: number
  runOuts: number
  stumpings: number
  catchesAsKeeper: number
  stumpingsAsKeeper: number
}

// Every playing XI member gets `matchesPlayed` credit; contributions (bat/
// bowl/field) are folded in per player from both innings' final stats.
export async function applyMatchToPlayerStats(match: Match): Promise<void> {
  const playingXI = new Set([...match.teamA.playingXI, ...match.teamB.playingXI])
  const wicketKeeperIds = new Set(
    [match.teamA.wicketKeeperId, match.teamB.wicketKeeperId].filter((id): id is string => !!id),
  )
  const contributions = new Map<string, Contribution>()
  const get = (id: string): Contribution => {
    let c = contributions.get(id)
    if (!c) {
      c = { catches: 0, runOuts: 0, stumpings: 0, catchesAsKeeper: 0, stumpingsAsKeeper: 0 }
      contributions.set(id, c)
    }
    return c
  }

  for (const innings of [match.innings1, match.innings2]) {
    if (!innings) continue
    for (const bat of Object.values(innings.battingStats)) {
      get(bat.playerId).batting = bat
      const fielderId = bat.dismissal?.fielderId
      if (bat.isOut && fielderId) {
        const fc = get(fielderId)
        const isKeeper = wicketKeeperIds.has(fielderId)
        if (bat.dismissal?.type === 'caught') {
          fc.catches += 1
          if (isKeeper) fc.catchesAsKeeper += 1
        } else if (bat.dismissal?.type === 'runOut') {
          fc.runOuts += 1
        } else if (bat.dismissal?.type === 'stumped') {
          fc.stumpings += 1
          if (isKeeper) fc.stumpingsAsKeeper += 1
        }
      }
    }
    for (const bowl of Object.values(innings.bowlingStats)) {
      get(bowl.playerId).bowling = bowl
    }
  }

  const playerIds = new Set([...playingXI, ...contributions.keys()])
  for (const playerId of playerIds) {
    const contribution = contributions.get(playerId)
    await applyOnePlayer(playerId, playingXI.has(playerId), contribution)
  }
}

async function applyOnePlayer(playerId: string, playedThisMatch: boolean, contribution: Contribution | undefined) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(statsRef(playerId))
    const current: PlayerStats = snap.exists() ? (snap.data() as PlayerStats) : { ...zeroStats(playerId), updatedAt: null as never }
    const next: PlayerStats = {
      ...current,
      playerId,
      matchesPlayed: current.matchesPlayed + (playedThisMatch ? 1 : 0),
      batting: { ...current.batting },
      bowling: { ...current.bowling },
      fielding: { ...current.fielding },
      wicketKeeping: { ...current.wicketKeeping },
      updatedAt: serverTimestamp() as never,
    }

    const bat = contribution?.batting
    if (bat) {
      next.batting.innings += 1
      next.batting.runs += bat.runs
      next.batting.balls += bat.balls
      next.batting.fours += bat.fours
      next.batting.sixes += bat.sixes
      next.batting.notOuts += bat.isOut ? 0 : 1
      next.batting.highScore = Math.max(next.batting.highScore, bat.runs)
      const band = battingBand(bat.runs)
      if (band) next.batting[band] += 1
    }

    const bowl = contribution?.bowling
    if (bowl) {
      next.bowling.innings += 1
      next.bowling.legalBalls += bowl.legalBalls
      next.bowling.runsConceded += bowl.runsConceded
      next.bowling.wickets += bowl.wickets
      next.bowling.maidens += bowl.maidens
      next.bowling.fours += bowl.fours
      next.bowling.sixes += bowl.sixes
      const isBetter =
        bowl.wickets > next.bowling.bestWickets ||
        (bowl.wickets === next.bowling.bestWickets && bowl.runsConceded < next.bowling.bestRuns) ||
        next.bowling.innings === 1
      if (isBetter) {
        next.bowling.bestWickets = bowl.wickets
        next.bowling.bestRuns = bowl.runsConceded
      }
      const band = bowlingHaulBand(bowl.wickets)
      if (band) next.bowling[band] += 1
    }

    if (contribution) {
      next.fielding.catches += contribution.catches
      next.fielding.runOuts += contribution.runOuts
      next.fielding.stumpings += contribution.stumpings
      next.wicketKeeping.catchesAsKeeper += contribution.catchesAsKeeper
      next.wicketKeeping.stumpings += contribution.stumpingsAsKeeper
      next.wicketKeeping.dismissals += contribution.catchesAsKeeper + contribution.stumpingsAsKeeper
    }

    tx.set(statsRef(playerId), next)
  })
}

export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const snap = await getDoc(statsRef(playerId))
  return snap.exists() ? (snap.data() as PlayerStats) : null
}
