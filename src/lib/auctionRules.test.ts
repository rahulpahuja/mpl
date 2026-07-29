import { describe, expect, it } from 'vitest'
import { assertUnsoldAssignment, assertValidBid, computeCommonPurseUpdate, getMinAcceptableBid } from './auctionRules'

const openPlayer = { status: 'open' as const, currentBid: 0, basePrice: 100 }
const manager = { name: 'Mumbai Mavericks', maxPlayers: 8, remainingTokens: 500 }

describe('getMinAcceptableBid', () => {
  it('returns base price when nobody has bid yet', () => {
    expect(getMinAcceptableBid({ currentBid: 0, basePrice: 100 }, 25)).toBe(100)
  })

  it('returns current bid plus increment once bidding has started', () => {
    expect(getMinAcceptableBid({ currentBid: 150, basePrice: 100 }, 25)).toBe(175)
  })
})

describe('assertValidBid', () => {
  it('accepts a bid that meets the minimum and stays within limits', () => {
    expect(() => assertValidBid(openPlayer, manager, 100, 25, 0)).not.toThrow()
  })

  it('rejects a player that is not open for bidding', () => {
    expect(() => assertValidBid({ ...openPlayer, status: 'sold' }, manager, 100, 25, 0)).toThrow(
      'Player is not open for bidding',
    )
  })

  it('rejects a bid below the minimum acceptable amount', () => {
    expect(() => assertValidBid(openPlayer, manager, 50, 25, 0)).toThrow('Bid must be at least 100')
  })

  it('rejects a bid the team cannot afford', () => {
    expect(() => assertValidBid(openPlayer, { ...manager, remainingTokens: 50 }, 100, 25, 0)).toThrow(
      'Insufficient tokens for this bid',
    )
  })

  it('rejects a bid once the squad is full', () => {
    expect(() => assertValidBid(openPlayer, { ...manager, maxPlayers: 3 }, 100, 25, 3)).toThrow(
      `${manager.name} has already reached its 3-player limit`,
    )
  })
})

describe('computeCommonPurseUpdate', () => {
  it('recomputes remaining tokens against the new purse', () => {
    expect(computeCommonPurseUpdate({ name: 'Delhi Dragons', tokensSpent: 300 }, 2000)).toEqual({
      purse: 2000,
      remainingTokens: 1700,
    })
  })

  it('rejects a purse lower than tokens already spent', () => {
    expect(() => computeCommonPurseUpdate({ name: 'Delhi Dragons', tokensSpent: 300 }, 200)).toThrow(
      /below tokens already spent/,
    )
  })
})

describe('assertUnsoldAssignment', () => {
  const team = { name: 'Chennai Chargers', maxPlayers: 8, remainingTokens: 500 }

  it('accepts assigning an unsold player within budget and capacity', () => {
    expect(() => assertUnsoldAssignment({ status: 'unsold' }, team, 100, 0)).not.toThrow()
  })

  it('rejects players that were never marked unsold', () => {
    expect(() => assertUnsoldAssignment({ status: 'open' }, team, 100, 0)).toThrow(
      'Only unsold players can be assigned directly to a team',
    )
  })

  it('rejects a negative assignment price', () => {
    expect(() => assertUnsoldAssignment({ status: 'unsold' }, team, -10, 0)).toThrow(
      'Assignment price cannot be negative',
    )
  })

  it('rejects assignment once the squad is full', () => {
    expect(() => assertUnsoldAssignment({ status: 'unsold' }, { ...team, maxPlayers: 2 }, 100, 2)).toThrow(
      `${team.name} has already reached its 2-player limit`,
    )
  })

  it('rejects assignment beyond remaining tokens', () => {
    expect(() => assertUnsoldAssignment({ status: 'unsold' }, { ...team, remainingTokens: 50 }, 100, 0)).toThrow(
      'Insufficient tokens for this assignment',
    )
  })
})
