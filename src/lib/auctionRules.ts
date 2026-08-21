import type { Player, TeamManagerEntry } from '../types'

export function getMinAcceptableBid(
  player: Pick<Player, 'currentBid' | 'basePrice'>,
  bidIncrement: number,
): number {
  return player.currentBid > 0 ? player.currentBid + bidIncrement : player.basePrice
}

export function assertValidBid(
  player: Pick<Player, 'currentBid' | 'basePrice' | 'status'>,
  manager: Pick<TeamManagerEntry, 'name' | 'maxPlayers' | 'remainingTokens'>,
  amount: number,
  bidIncrement: number,
  soldCountForManager: number,
  // Number of players this bid would win at once — >1 when the current
  // player is part of a combo lot (see lib/auctions.ts), since the whole
  // group joins the squad together on sale.
  groupSize = 1,
): void {
  if (player.status !== 'open' && player.status !== 'active') {
    throw new Error('Player is not open for bidding')
  }
  const minAcceptable = getMinAcceptableBid(player, bidIncrement)
  if (amount < minAcceptable) {
    throw new Error(`Bid must be at least ${minAcceptable}`)
  }
  if (amount > manager.remainingTokens) {
    throw new Error('Insufficient tokens for this bid')
  }
  if (soldCountForManager + groupSize > manager.maxPlayers) {
    throw new Error(`${manager.name} has already reached its ${manager.maxPlayers}-player limit`)
  }
}

export function computeCommonPurseUpdate(
  team: Pick<TeamManagerEntry, 'name' | 'tokensSpent'>,
  newPurse: number,
): { purse: number; remainingTokens: number } {
  if (newPurse < team.tokensSpent) {
    throw new Error(
      `Common purse (${newPurse}) is below tokens already spent (${team.tokensSpent}) by ${team.name}`,
    )
  }
  return { purse: newPurse, remainingTokens: newPurse - team.tokensSpent }
}

export function assertUnsoldAssignment(
  player: Pick<Player, 'status'>,
  team: Pick<TeamManagerEntry, 'name' | 'maxPlayers' | 'remainingTokens'>,
  amount: number,
  soldCountForManager: number,
  // Same combo-lot meaning as assertValidBid's groupSize.
  groupSize = 1,
): void {
  if (player.status !== 'unsold') {
    throw new Error('Only unsold players can be assigned directly to a team')
  }
  if (amount < 0) {
    throw new Error('Assignment price cannot be negative')
  }
  if (soldCountForManager + groupSize > team.maxPlayers) {
    throw new Error(`${team.name} has already reached its ${team.maxPlayers}-player limit`)
  }
  if (amount > team.remainingTokens) {
    throw new Error('Insufficient tokens for this assignment')
  }
}
