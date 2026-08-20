import { describe, expect, it } from 'vitest'
import {
  assertCanRecordBall,
  computeMatchResult,
  formatOvers,
  netRunRate,
  recordBall,
  setNextBatsman,
  setNextBowler,
  startInnings,
} from './matchRules'
import type { InningsState } from '../types'

const scoredBy = 'scorer-1'

function readyInnings(target: number | null = null): InningsState {
  let innings = startInnings('teamA', 'teamB', target ? 2 : 1, target)
  innings = setNextBatsman(innings, { playerId: 'bat1', name: 'Rohit' })
  innings = setNextBatsman(innings, { playerId: 'bat2', name: 'Kohli' })
  innings = setNextBowler(innings, { playerId: 'bowl1', name: 'Bumrah' })
  return innings
}

function bowlOver(innings: InningsState, runsPerBall: number[], oversLimit = 20): InningsState {
  let current = innings
  for (const runs of runsPerBall) {
    current = recordBall(current, oversLimit, 10, { runs, extraType: null, isWicket: false, scoredBy }).innings
  }
  return current
}

describe('startInnings + setNextBatsman/setNextBowler', () => {
  it('fills striker then non-striker, and rejects a third batsman', () => {
    let innings = startInnings('teamA', 'teamB', 1)
    innings = setNextBatsman(innings, { playerId: 'bat1', name: 'Rohit' })
    expect(innings.strikerId).toBe('bat1')
    innings = setNextBatsman(innings, { playerId: 'bat2', name: 'Kohli' })
    expect(innings.nonStrikerId).toBe('bat2')
    expect(() => setNextBatsman(innings, { playerId: 'bat3', name: 'Rahul' })).toThrow(
      'Both batting slots are already filled',
    )
  })

  it('rejects a bowler bowling the same over twice in a row', () => {
    let innings = readyInnings()
    innings = bowlOver(innings, [0, 0, 0, 0, 0, 0])
    expect(innings.currentBowlerId).toBeNull()
    expect(() => setNextBowler(innings, { playerId: 'bowl1', name: 'Bumrah' })).toThrow(
      'The same bowler cannot bowl two overs in a row',
    )
    innings = setNextBowler(innings, { playerId: 'bowl2', name: 'Shami' })
    expect(innings.currentBowlerId).toBe('bowl2')
  })
})

describe('recordBall — normal runs and strike rotation', () => {
  it('rotates strike on odd runs and swaps at the end of the over', () => {
    let innings = readyInnings()
    expect(innings.strikerId).toBe('bat1')
    innings = recordBall(innings, 20, 10, { runs: 1, extraType: null, isWicket: false, scoredBy }).innings
    expect(innings.strikerId).toBe('bat2')
    innings = bowlOver(innings, [0, 0, 0, 0, 0]) // 5 more legal balls -> over complete
    // over-end swap on top of whatever rotation happened
    expect(innings.legalBallsBowled).toBe(6)
    expect(innings.currentBowlerId).toBeNull()
    expect(innings.lastOverBowlerId).toBe('bowl1')
  })

  it('credits runs, balls, and boundary counts to the striker', () => {
    let innings = readyInnings()
    innings = recordBall(innings, 20, 10, { runs: 4, extraType: null, isWicket: false, scoredBy }).innings
    expect(innings.battingStats.bat1.runs).toBe(4)
    expect(innings.battingStats.bat1.fours).toBe(1)
    expect(innings.battingStats.bat1.balls).toBe(1)
    expect(innings.totalRuns).toBe(4)
    expect(innings.bowlingStats.bowl1.runsConceded).toBe(4)
  })
})

describe('recordBall — extras', () => {
  it('a wide adds a run, does not consume a ball, and blocks setting a next batsman', () => {
    let innings = readyInnings()
    const { innings: after, ball, overCompleted } = recordBall(innings, 20, 10, {
      runs: 0,
      extraType: 'wide',
      isWicket: false,
      scoredBy,
    })
    expect(after.totalRuns).toBe(1)
    expect(after.extras.wides).toBe(1)
    expect(after.legalBallsBowled).toBe(0)
    expect(overCompleted).toBe(false)
    expect(ball.extraType).toBe('wide')
  })

  it('rejects a bowled/caught/lbw dismissal on a wide', () => {
    const innings = readyInnings()
    expect(() =>
      recordBall(innings, 20, 10, { runs: 0, extraType: 'wide', isWicket: true, wicketType: 'bowled', scoredBy }),
    ).toThrow('Only a run out is possible')
  })

  it('allows a run out on a wide', () => {
    const innings = readyInnings()
    const { innings: after } = recordBall(innings, 20, 10, {
      runs: 0,
      extraType: 'wide',
      isWicket: true,
      wicketType: 'runOut',
      dismissedPlayerId: 'bat1',
      scoredBy,
    })
    expect(after.wickets).toBe(1)
    expect(after.strikerId).toBeNull()
  })

  it('a no ball sets isFreeHit for the next ball and credits bat runs', () => {
    let innings = readyInnings()
    innings = recordBall(innings, 20, 10, { runs: 6, extraType: 'noBall', isWicket: false, scoredBy }).innings
    expect(innings.totalRuns).toBe(7)
    expect(innings.extras.noBalls).toBe(1)
    expect(innings.legalBallsBowled).toBe(0)
    expect(innings.isFreeHit).toBe(true)
    expect(innings.battingStats.bat1.sixes).toBe(1)
    expect(innings.bowlingStats.bowl1.sixes).toBe(1)
  })

  it('rejects a non-run-out dismissal on a free hit, and clears the free hit after a legal ball', () => {
    let innings = readyInnings()
    innings = recordBall(innings, 20, 10, { runs: 0, extraType: 'noBall', isWicket: false, scoredBy }).innings
    expect(innings.isFreeHit).toBe(true)
    expect(() =>
      recordBall(innings, 20, 10, { runs: 0, extraType: null, isWicket: true, wicketType: 'caught', scoredBy }),
    ).toThrow('Only a run out is possible')
    innings = recordBall(innings, 20, 10, { runs: 1, extraType: null, isWicket: false, scoredBy }).innings
    expect(innings.isFreeHit).toBe(false)
  })

  it('byes/leg byes count as a legal ball but credit no batsman runs', () => {
    let innings = readyInnings()
    innings = recordBall(innings, 20, 10, { runs: 2, extraType: 'bye', isWicket: false, scoredBy }).innings
    expect(innings.totalRuns).toBe(2)
    expect(innings.extras.byes).toBe(2)
    expect(innings.legalBallsBowled).toBe(1)
    expect(innings.battingStats.bat1.runs).toBe(0)
    expect(innings.battingStats.bat1.balls).toBe(1)
    expect(innings.bowlingStats.bowl1.runsConceded).toBe(0)
  })

  it('rejects a bowled dismissal on a bye', () => {
    const innings = readyInnings()
    expect(() =>
      recordBall(innings, 20, 10, { runs: 1, extraType: 'bye', isWicket: true, wicketType: 'bowled', scoredBy }),
    ).toThrow('not possible off a bye/leg bye')
  })
})

describe('recordBall — wickets', () => {
  it('marks the striker out and blocks further balls until a new batsman is picked', () => {
    let innings = readyInnings()
    innings = recordBall(innings, 20, 10, { runs: 0, extraType: null, isWicket: true, wicketType: 'bowled', scoredBy })
      .innings
    expect(innings.wickets).toBe(1)
    expect(innings.strikerId).toBeNull()
    expect(innings.battingStats.bat1.isOut).toBe(true)
    expect(innings.battingStats.bat1.dismissal?.type).toBe('bowled')
    expect(() => assertCanRecordBall(innings)).toThrow('Pick the next batsman')
    innings = setNextBatsman(innings, { playerId: 'bat3', name: 'Rahul' })
    expect(innings.strikerId).toBe('bat3')
    expect(() => assertCanRecordBall(innings)).not.toThrow()
  })

  it('ends the innings all out on the 10th wicket without requiring an 11th batsman', () => {
    let innings = readyInnings()
    let nextBatsman = 3
    for (let i = 0; i < 10; i++) {
      const result = recordBall(innings, 20, 10, {
        runs: 0,
        extraType: null,
        isWicket: true,
        wicketType: 'bowled',
        scoredBy,
      })
      innings = result.innings
      if (result.inningsCompleted) break
      innings = setNextBatsman(innings, { playerId: `bat${nextBatsman}`, name: `Player ${nextBatsman}` })
      nextBatsman++
      if (result.overCompleted) innings = setNextBowler(innings, { playerId: 'bowl-relief', name: 'Reliever' })
    }
    expect(innings.wickets).toBe(10)
    expect(innings.completedReason).toBe('allOut')
  })
})

describe('recordBall — innings completion', () => {
  it('ends the innings once the overs limit is reached', () => {
    let innings = readyInnings()
    innings = bowlOver(innings, [0, 0, 0, 0, 0, 0], 2)
    expect(innings.completedReason).toBeNull()
    innings = setNextBowler(innings, { playerId: 'bowl2', name: 'Shami' })
    innings = bowlOver(innings, [0, 0, 0, 0, 0, 0], 2)
    expect(innings.legalBallsBowled).toBe(12)
    expect(innings.completedReason).toBe('oversComplete')
  })

  it('ends the second innings once the target is chased down', () => {
    let innings = readyInnings(10)
    const { innings: after, inningsCompleted } = recordBall(innings, 20, 10, {
      runs: 6,
      extraType: null,
      isWicket: false,
      scoredBy,
    })
    innings = after
    expect(inningsCompleted).toBe(false)
    const final = recordBall(innings, 20, 10, { runs: 6, extraType: null, isWicket: false, scoredBy })
    expect(final.inningsCompleted).toBe(true)
    expect(final.innings.completedReason).toBe('targetReached')
    expect(final.innings.totalRuns).toBe(12)
  })
})

describe('formatOvers / netRunRate / computeMatchResult', () => {
  it('formats overs as overs.balls', () => {
    expect(formatOvers(0)).toBe('0.0')
    expect(formatOvers(5)).toBe('0.5')
    expect(formatOvers(6)).toBe('1.0')
    expect(formatOvers(13)).toBe('2.1')
  })

  it('computes net run rate', () => {
    expect(netRunRate(160, 20, 140, 20)).toBeCloseTo(1.0)
    expect(netRunRate(0, 0, 100, 20)).toBe(0)
  })

  it('reports the chasing team winning by wickets in hand', () => {
    const teamA = { teamId: 'teamA', teamName: 'Mavericks' } as const
    const teamB = { teamId: 'teamB', teamName: 'Titans' } as const
    const innings1 = { ...startInnings('teamA', 'teamB', 1), totalRuns: 150, completedReason: 'oversComplete' as const }
    const innings2 = {
      ...startInnings('teamB', 'teamA', 2, 151),
      totalRuns: 151,
      wickets: 4,
      completedReason: 'targetReached' as const,
    }
    const { result, winnerTeamId } = computeMatchResult({
      teamA: { ...teamA, logoId: null, logoImage: null, jerseyColor: null, playingXI: [] },
      teamB: { ...teamB, logoId: null, logoImage: null, jerseyColor: null, playingXI: [] },
      innings1,
      innings2,
    })
    expect(winnerTeamId).toBe('teamB')
    expect(result).toBe('Titans won by 6 wickets')
  })
})
