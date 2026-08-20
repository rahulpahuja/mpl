// Pure, side-effect-free cricket scoring engine — every rule for turning one
// ball into an updated innings lives here so it can be unit tested in
// isolation (see matchRules.test.ts) and reused identically by both the live
// scorer (lib/matches.ts, via a Firestore transaction) and undoLastBall's
// replay-from-scratch reconstruction.
import type {
  BallOutcome,
  BatsmanInningsStat,
  BowlerInningsStat,
  ExtraType,
  InningsState,
  Match,
  WicketType,
} from '../types'

export interface ScoreBallInput {
  // Runs to credit for this delivery — meaning depends on extraType:
  // normal/noBall: runs off the bat. bye/legBye: runs run (the extra
  // itself). wide: *additional* runs run on top of the automatic 1.
  runs: number
  extraType: ExtraType | null
  isWicket: boolean
  wicketType?: WicketType | null
  // Defaults to the striker. Only meaningful (and only ever differs from the
  // striker) for a run-out of the non-striker.
  dismissedPlayerId?: string | null
  fielderId?: string | null
  fielderName?: string | null
  scoredBy: string
}

export interface RecordBallResult {
  innings: InningsState
  ball: Omit<BallOutcome, 'timestamp'>
  overCompleted: boolean
  inningsCompleted: boolean
}

const NON_RUN_OUT_DISMISSAL_BLOCKED_ON: ReadonlySet<ExtraType> = new Set(['wide', 'noBall'])
const BAT_DISMISSALS: ReadonlySet<WicketType> = new Set(['bowled', 'caught', 'lbw'])

export function startInnings(
  battingTeamId: string,
  bowlingTeamId: string,
  inningsNumber: 1 | 2,
  target: number | null = null,
): InningsState {
  return {
    inningsNumber,
    battingTeamId,
    bowlingTeamId,
    totalRuns: 0,
    wickets: 0,
    legalBallsBowled: 0,
    currentOverBalls: [],
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    lastOverBowlerId: null,
    isFreeHit: false,
    battingStats: {},
    bowlingStats: {},
    fallOfWickets: [],
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    target,
    completedReason: null,
  }
}

export function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}

export function netRunRate(runsFor: number, oversFor: number, runsAgainst: number, oversAgainst: number): number {
  if (oversFor <= 0 || oversAgainst <= 0) return 0
  return runsFor / oversFor - runsAgainst / oversAgainst
}

export function assertCanRecordBall(innings: InningsState): void {
  if (innings.completedReason) throw new Error('This innings has already finished')
  if (!innings.strikerId || !innings.nonStrikerId) {
    throw new Error('Pick the next batsman before recording another ball')
  }
  if (!innings.currentBowlerId) {
    throw new Error('Pick the next over’s bowler before recording another ball')
  }
}

export function setNextBatsman(
  innings: InningsState,
  player: { playerId: string; name: string },
): InningsState {
  if (innings.battingStats[player.playerId]) {
    throw new Error(`${player.name} has already batted this innings`)
  }
  let strikerId = innings.strikerId
  let nonStrikerId = innings.nonStrikerId
  if (strikerId === null) {
    strikerId = player.playerId
  } else if (nonStrikerId === null) {
    nonStrikerId = player.playerId
  } else {
    throw new Error('Both batting slots are already filled')
  }
  const battingOrder = Object.keys(innings.battingStats).length + 1
  const entry: BatsmanInningsStat = {
    playerId: player.playerId,
    name: player.name,
    battingOrder,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false,
    dismissal: null,
  }
  return {
    ...innings,
    strikerId,
    nonStrikerId,
    battingStats: { ...innings.battingStats, [player.playerId]: entry },
  }
}

export function setNextBowler(innings: InningsState, bowler: { playerId: string; name: string }): InningsState {
  if (innings.currentBowlerId) throw new Error('A bowler is already set for this over')
  if (bowler.playerId === innings.lastOverBowlerId) {
    throw new Error('The same bowler cannot bowl two overs in a row')
  }
  const existing = innings.bowlingStats[bowler.playerId]
  const entry: BowlerInningsStat =
    existing ?? {
      playerId: bowler.playerId,
      name: bowler.name,
      legalBalls: 0,
      runsConceded: 0,
      wickets: 0,
      maidens: 0,
      fours: 0,
      sixes: 0,
    }
  return {
    ...innings,
    currentBowlerId: bowler.playerId,
    bowlingStats: { ...innings.bowlingStats, [bowler.playerId]: entry },
  }
}

export function recordBall(
  innings: InningsState,
  oversLimit: number,
  maxWickets: number,
  input: ScoreBallInput,
): RecordBallResult {
  assertCanRecordBall(innings)
  if (input.runs < 0) throw new Error('Runs cannot be negative')

  const extraType = input.extraType
  const isLegalBall = extraType !== 'wide' && extraType !== 'noBall'
  const freeHitActive = innings.isFreeHit

  if (input.isWicket) {
    const type = input.wicketType
    if (!type) throw new Error('Wicket type is required')
    if (freeHitActive || (extraType && NON_RUN_OUT_DISMISSAL_BLOCKED_ON.has(extraType))) {
      if (type !== 'runOut') throw new Error('Only a run out is possible on a wide/no-ball or free hit')
    } else if ((extraType === 'bye' || extraType === 'legBye') && BAT_DISMISSALS.has(type)) {
      throw new Error(`${type} is not possible off a bye/leg bye`)
    }
  }

  // Runs charged against the bowler's figures and runs added to the team
  // total both depend on the extra type — byes/leg byes aren't charged to
  // the bowler even though they count for the team.
  let teamRuns: number
  let bowlerRunsCharged: number
  let batRunsCredited = 0
  let rotationRuns = input.runs
  switch (extraType) {
    case 'wide':
      teamRuns = 1 + input.runs
      bowlerRunsCharged = teamRuns
      break
    case 'noBall':
      teamRuns = 1 + input.runs
      bowlerRunsCharged = teamRuns
      batRunsCredited = input.runs
      break
    case 'bye':
    case 'legBye':
      teamRuns = input.runs
      bowlerRunsCharged = 0
      break
    case 'penalty':
      teamRuns = input.runs
      bowlerRunsCharged = 0
      rotationRuns = 0
      break
    default:
      teamRuns = input.runs
      bowlerRunsCharged = input.runs
      batRunsCredited = input.runs
  }

  const onStrikeAtStart = innings.strikerId as string
  const nonStrikerAtStart = innings.nonStrikerId as string
  const bowlerId = innings.currentBowlerId as string

  const legalBallsBowled = innings.legalBallsBowled + (isLegalBall ? 1 : 0)
  const willCompleteOver = isLegalBall && legalBallsBowled % 6 === 0
  const wickets = innings.wickets + (input.isWicket ? 1 : 0)
  const totalRuns = innings.totalRuns + teamRuns

  let strikerId: string | null = onStrikeAtStart
  let nonStrikerId: string | null = nonStrikerAtStart
  if (rotationRuns % 2 === 1) [strikerId, nonStrikerId] = [nonStrikerId, strikerId]
  if (willCompleteOver) [strikerId, nonStrikerId] = [nonStrikerId, strikerId]

  const dismissedId = input.isWicket ? (input.dismissedPlayerId ?? onStrikeAtStart) : null
  if (dismissedId) {
    if (strikerId === dismissedId) strikerId = null
    else if (nonStrikerId === dismissedId) nonStrikerId = null
    else throw new Error('Dismissed player is not currently batting')
  }

  const allOut = wickets >= maxWickets
  const oversComplete = legalBallsBowled >= oversLimit * 6
  const targetReached = innings.target != null && totalRuns >= innings.target
  const inningsCompleted = allOut || oversComplete || targetReached
  const completedReason = allOut ? 'allOut' : oversComplete ? 'oversComplete' : targetReached ? 'targetReached' : null

  const bowlerNameForDismissal = innings.bowlingStats[bowlerId].name
  const dismissalForBatsman = (): { type: WicketType; bowlerId: string | null; bowlerName: string | null; fielderId: string | null; fielderName: string | null } => ({
    type: input.wicketType as WicketType,
    bowlerId: input.wicketType === 'runOut' ? null : bowlerId,
    bowlerName: input.wicketType === 'runOut' ? null : bowlerNameForDismissal,
    fielderId: input.fielderId ?? null,
    fielderName: input.fielderName ?? null,
  })

  const battingStats = { ...innings.battingStats }
  const strikerEntry = battingStats[onStrikeAtStart]
  battingStats[onStrikeAtStart] = {
    ...strikerEntry,
    runs: strikerEntry.runs + batRunsCredited,
    balls: strikerEntry.balls + (isLegalBall ? 1 : 0),
    fours: strikerEntry.fours + (batRunsCredited === 4 ? 1 : 0),
    sixes: strikerEntry.sixes + (batRunsCredited === 6 ? 1 : 0),
    isOut: dismissedId === onStrikeAtStart ? true : strikerEntry.isOut,
    dismissal: dismissedId === onStrikeAtStart ? dismissalForBatsman() : strikerEntry.dismissal,
  }
  if (dismissedId === nonStrikerAtStart) {
    const nonStrikerEntry = battingStats[nonStrikerAtStart]
    battingStats[nonStrikerAtStart] = { ...nonStrikerEntry, isOut: true, dismissal: dismissalForBatsman() }
  }

  const bowlingStats = { ...innings.bowlingStats }
  const bowlerEntry = bowlingStats[bowlerId]
  const overRunsSoFar = innings.currentOverBalls.reduce((sum, b) => sum + b.runs, 0) + teamRuns
  bowlingStats[bowlerId] = {
    ...bowlerEntry,
    legalBalls: bowlerEntry.legalBalls + (isLegalBall ? 1 : 0),
    runsConceded: bowlerEntry.runsConceded + bowlerRunsCharged,
    wickets: bowlerEntry.wickets + (input.isWicket && input.wicketType !== 'runOut' ? 1 : 0),
    maidens: bowlerEntry.maidens + (willCompleteOver && overRunsSoFar === 0 ? 1 : 0),
    fours: bowlerEntry.fours + (batRunsCredited === 4 ? 1 : 0),
    sixes: bowlerEntry.sixes + (batRunsCredited === 6 ? 1 : 0),
  }

  const fallOfWickets = input.isWicket
    ? [
        ...innings.fallOfWickets,
        {
          wicket: wickets,
          runs: totalRuns,
          playerId: dismissedId as string,
          playerName: battingStats[dismissedId as string].name,
          overSummary: formatOvers(legalBallsBowled),
        },
      ]
    : innings.fallOfWickets

  const currentOverBalls = willCompleteOver
    ? []
    : [...innings.currentOverBalls, { runs: teamRuns, extraType, isWicket: input.isWicket }]

  const extras = { ...innings.extras }
  if (extraType === 'wide') extras.wides += teamRuns
  else if (extraType === 'noBall') extras.noBalls += 1
  else if (extraType === 'bye') extras.byes += teamRuns
  else if (extraType === 'legBye') extras.legByes += teamRuns
  else if (extraType === 'penalty') extras.penalty += teamRuns

  const updated: InningsState = {
    ...innings,
    totalRuns,
    wickets,
    legalBallsBowled,
    currentOverBalls,
    strikerId: inningsCompleted ? innings.strikerId : strikerId,
    nonStrikerId: inningsCompleted ? innings.nonStrikerId : nonStrikerId,
    currentBowlerId: inningsCompleted ? bowlerId : willCompleteOver ? null : bowlerId,
    lastOverBowlerId: willCompleteOver ? bowlerId : innings.lastOverBowlerId,
    isFreeHit: extraType === 'noBall' ? true : isLegalBall ? false : innings.isFreeHit,
    battingStats,
    bowlingStats,
    fallOfWickets,
    extras,
    completedReason,
  }

  const ball: Omit<BallOutcome, 'timestamp'> = {
    inningsNumber: innings.inningsNumber,
    overNumber: Math.floor(innings.legalBallsBowled / 6),
    ballInOver: (innings.legalBallsBowled % 6) + 1,
    bowlerId,
    strikerId: onStrikeAtStart,
    nonStrikerId: nonStrikerAtStart,
    runs: batRunsCredited,
    extraType,
    extraRuns: teamRuns - batRunsCredited,
    isWicket: input.isWicket,
    wicketType: input.isWicket ? input.wicketType : null,
    dismissedPlayerId: dismissedId,
    fielderId: input.fielderId ?? null,
    isFreeHit: freeHitActive,
    scoredBy: input.scoredBy,
  }

  return { innings: updated, ball, overCompleted: willCompleteOver, inningsCompleted }
}

export function computeMatchResult(match: Pick<Match, 'teamA' | 'teamB' | 'innings1' | 'innings2'>): {
  result: string
  winnerTeamId: string | null
} {
  const { innings1, innings2 } = match
  if (!innings1 || !innings2 || !innings1.completedReason || !innings2.completedReason) {
    return { result: '', winnerTeamId: null }
  }
  const team1 = match.teamA.teamId === innings1.battingTeamId ? match.teamA : match.teamB
  const team2 = match.teamA.teamId === innings2.battingTeamId ? match.teamA : match.teamB
  if (innings2.totalRuns > innings1.totalRuns) {
    const maxWickets = 10
    const wicketsInHand = maxWickets - innings2.wickets
    return {
      result: `${team2.teamName} won by ${wicketsInHand} wicket${wicketsInHand === 1 ? '' : 's'}`,
      winnerTeamId: team2.teamId,
    }
  }
  if (innings1.totalRuns > innings2.totalRuns) {
    const margin = innings1.totalRuns - innings2.totalRuns
    return { result: `${team1.teamName} won by ${margin} run${margin === 1 ? '' : 's'}`, winnerTeamId: team1.teamId }
  }
  return { result: 'Match tied', winnerTeamId: null }
}
