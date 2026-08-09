import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { assertUnsoldAssignment, assertValidBid, computeCommonPurseUpdate } from './auctionRules'
import type { Auction, AuctionTeamStats, Player, PlayerBids, Team, TeamManagerEntry } from '../types'

function auctionRef(auctionId: string) {
  return doc(db, 'auctions', auctionId)
}

function bidsRef(auctionId: string, playerId: string) {
  return doc(db, 'auctions', auctionId, 'bids', playerId)
}

function teamRef(auctionId: string, teamId: string) {
  return doc(db, 'auctions', auctionId, 'teams', teamId)
}

function generateAuctionId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function createAuction(name: string, createdBy: string, bidIncrement = 10): Promise<string> {
  const auctionId = generateAuctionId()
  const auction: Omit<Auction, 'createdAt' | 'startTime'> = {
    auctionId,
    name,
    status: 'draft',
    createdBy,
    bidIncrement,
    auctionManagerIds: [createdBy],
    teamManagerIds: [],
    currentPlayerId: null,
    timerDurationSeconds: 30,
    timerEndsAt: null,
    players: [],
    teamManagers: [],
  }
  await setDoc(auctionRef(auctionId), {
    ...auction,
    createdAt: serverTimestamp(),
    startTime: null,
  })
  return auctionId
}

export async function updateAuctionStatus(auctionId: string, status: Auction['status']) {
  if (status === 'completed') {
    // Anyone still 'open' (never brought up) or 'active' (on the block when the
    // auction was ended) is unsold in every practical sense — without this,
    // they'd stay in limbo forever and the unsold count everywhere (Results,
    // the manage panel) would silently undercount them.
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(auctionRef(auctionId))
      if (!snap.exists()) throw new Error('Auction not found')
      const auction = snap.data() as Auction
      const players = auction.players.map((p) =>
        p.status === 'open' || p.status === 'active'
          ? { ...p, status: 'unsold' as const, currentBid: 0, currentBidder: null, currentBidderName: null }
          : p,
      )
      tx.update(auctionRef(auctionId), { status, players, currentPlayerId: null, timerEndsAt: null })
    })
    return
  }
  await updateDoc(auctionRef(auctionId), {
    status,
    ...(status === 'live' ? { startTime: serverTimestamp() } : {}),
  })
}

export async function updateAuctionSettings(
  auctionId: string,
  settings: Partial<Pick<Auction, 'bidIncrement' | 'timerDurationSeconds'>>,
) {
  await updateDoc(auctionRef(auctionId), settings)
}

export async function applyCommonPurseToAllTeams(auctionId: string, purse: number) {
  const teamUpdates: { teamId: string; remainingTokens: number }[] = []
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const teamManagers = auction.teamManagers.map((tm) => {
      const { remainingTokens } = computeCommonPurseUpdate(tm, purse)
      teamUpdates.push({ teamId: tm.teamId, remainingTokens })
      return { ...tm, purse, remainingTokens }
    })
    tx.update(auctionRef(auctionId), { teamManagers })
  })
  await Promise.all(
    teamUpdates.map(({ teamId, remainingTokens }) =>
      updateDoc(teamRef(auctionId, teamId), { initialPurse: purse, balance: remainingTokens }),
    ),
  )
}

export async function applyMaxPlayersToAllTeams(auctionId: string, maxPlayers: number) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const teamManagers = auction.teamManagers.map((tm) => {
      const soldCount = auction.players.filter(
        (p) => p.currentBidder === tm.managerId && p.status === 'sold',
      ).length
      if (maxPlayers < soldCount) {
        throw new Error(`${tm.name} already has ${soldCount} players sold, above ${maxPlayers}`)
      }
      return { ...tm, maxPlayers }
    })
    tx.update(auctionRef(auctionId), { teamManagers })
  })
}

export async function addPlayers(auctionId: string, players: Omit<Player, 'currentBid' | 'currentBidder' | 'currentBidderName' | 'status'>[]) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const newPlayers: Player[] = players.map((p) => ({
      ...p,
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      status: 'open',
    }))
    tx.update(auctionRef(auctionId), {
      players: [...auction.players, ...newPlayers],
    })
  })
}

// Only lets a still-open player (never went under the hammer) be removed —
// a sold/unsold player has already affected a team's purse/roster or auction
// history, and unwinding that safely is out of scope for a roster-cleanup action.
export async function removePlayer(auctionId: string, playerId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) return
    if (player.status !== 'open') {
      throw new Error('Only players that are still open can be removed.')
    }
    tx.update(auctionRef(auctionId), {
      players: auction.players.filter((p) => p.playerId !== playerId),
    })
  })
}

export async function addTeamToAuction(
  auctionId: string,
  team: Team,
  purse: number,
  maxPlayers: number,
) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    if (auction.teamManagers.some((tm) => tm.teamId === team.teamId)) {
      throw new Error('This team is already part of this auction')
    }
    const entry: TeamManagerEntry = {
      teamId: team.teamId,
      managerId: team.managerId,
      name: team.teamName,
      maxPlayers,
      purse,
      tokensSpent: 0,
      remainingTokens: purse,
    }
    tx.update(auctionRef(auctionId), {
      teamManagers: [...auction.teamManagers, entry],
      teamManagerIds: [...auction.teamManagerIds, team.managerId],
    })
    tx.set(teamRef(auctionId, team.teamId), {
      teamId: team.teamId,
      teamName: team.teamName,
      managerId: team.managerId,
      initialPurse: purse,
      spent: 0,
      balance: purse,
      players: [],
    })
    // Without this, the team's manager never gets this auction added to their
    // own assignedAuctions — their Home page (and everything gated on it, like
    // /bid/:auctionId) would show no sign of the auction even after a refresh.
    tx.update(doc(db, 'users', team.managerId), {
      assignedAuctions: arrayUnion(auctionId),
    })
  })
}

export async function setCurrentPlayer(auctionId: string, playerId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const players = auction.players.map((p) =>
      p.playerId === playerId ? { ...p, status: 'active' as const } : p,
    )
    tx.update(auctionRef(auctionId), { currentPlayerId: playerId, players, timerEndsAt: null })
  })
}

export async function startTimer(auctionId: string, durationSeconds: number) {
  await updateDoc(auctionRef(auctionId), {
    timerDurationSeconds: durationSeconds,
    timerEndsAt: Timestamp.fromMillis(Date.now() + durationSeconds * 1000),
  })
}

export async function stopTimer(auctionId: string) {
  await updateDoc(auctionRef(auctionId), { timerEndsAt: null })
}

export async function placeBid(
  auctionId: string,
  playerId: string,
  managerId: string,
  managerName: string,
  amount: number,
) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction

    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) throw new Error('Player not found')

    const manager = auction.teamManagers.find((tm) => tm.managerId === managerId)
    if (!manager) throw new Error('Manager is not registered for this auction')

    const squadSize = auction.players.filter(
      (p) => p.currentBidder === managerId && p.status === 'sold',
    ).length
    assertValidBid(player, manager, amount, auction.bidIncrement, squadSize)

    const players = auction.players.map((p) =>
      p.playerId === playerId
        ? { ...p, currentBid: amount, currentBidder: managerId, currentBidderName: managerName, status: 'active' as const }
        : p,
    )
    tx.update(auctionRef(auctionId), { players, currentPlayerId: playerId })

    tx.set(
      bidsRef(auctionId, playerId),
      {
        playerId,
        finalBidder: null,
        finalAmount: null,
        awardedAt: null,
        bids: arrayUnion({ managerId, managerName, amount, timestamp: Date.now() }),
      },
      { merge: true },
    )
  })
}

async function recordTeamPurchase(auctionId: string, playerId: string) {
  const auctionSnap = await getDoc(auctionRef(auctionId))
  if (!auctionSnap.exists()) return
  const auction = auctionSnap.data() as Auction
  const player = auction.players.find((p) => p.playerId === playerId)
  if (!player || !player.currentBidder) return

  const team = auction.teamManagers.find((tm) => tm.managerId === player.currentBidder)
  if (!team) return

  const teamsSnapRef = teamRef(auctionId, team.teamId)
  const teamSnap = await getDoc(teamsSnapRef)
  if (teamSnap.exists()) {
    const teamData = teamSnap.data() as AuctionTeamStats
    await updateDoc(teamsSnapRef, {
      spent: teamData.spent + player.currentBid,
      balance: teamData.balance - player.currentBid,
      players: [...teamData.players, { playerId: player.playerId, playerName: player.name, soldAt: player.currentBid }],
    })
  }
}

export async function markSold(auctionId: string, playerId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) throw new Error('Player not found')
    if (!player.currentBidder) throw new Error('No bids placed on this player')

    const players = auction.players.map((p) =>
      p.playerId === playerId ? { ...p, status: 'sold' as const } : p,
    )
    const teamManagers = auction.teamManagers.map((tm) =>
      tm.managerId === player.currentBidder
        ? {
            ...tm,
            tokensSpent: tm.tokensSpent + player.currentBid,
            remainingTokens: tm.remainingTokens - player.currentBid,
          }
        : tm,
    )
    tx.update(auctionRef(auctionId), {
      players,
      teamManagers,
      currentPlayerId: null,
      timerEndsAt: null,
    })
    tx.update(bidsRef(auctionId, playerId), {
      finalBidder: player.currentBidder,
      finalAmount: player.currentBid,
      awardedAt: serverTimestamp(),
    })
  })

  await recordTeamPurchase(auctionId, playerId)
}

export async function assignUnsoldPlayer(
  auctionId: string,
  playerId: string,
  teamId: string,
  amount?: number,
) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) throw new Error('Player not found')
    const team = auction.teamManagers.find((tm) => tm.teamId === teamId)
    if (!team) throw new Error('Team not found in this auction')

    const price = amount ?? player.basePrice
    const soldCount = auction.players.filter(
      (p) => p.currentBidder === team.managerId && p.status === 'sold',
    ).length
    assertUnsoldAssignment(player, team, price, soldCount)

    const players = auction.players.map((p) =>
      p.playerId === playerId
        ? {
            ...p,
            status: 'sold' as const,
            currentBid: price,
            currentBidder: team.managerId,
            currentBidderName: team.name,
          }
        : p,
    )
    const teamManagers = auction.teamManagers.map((tm) =>
      tm.teamId === teamId
        ? { ...tm, tokensSpent: tm.tokensSpent + price, remainingTokens: tm.remainingTokens - price }
        : tm,
    )
    tx.update(auctionRef(auctionId), { players, teamManagers })
    tx.set(
      bidsRef(auctionId, playerId),
      { playerId, finalBidder: team.managerId, finalAmount: price, awardedAt: serverTimestamp() },
      { merge: true },
    )
  })

  await recordTeamPurchase(auctionId, playerId)
}

export async function markUnsold(auctionId: string, playerId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const players = auction.players.map((p) =>
      p.playerId === playerId
        ? { ...p, status: 'unsold' as const, currentBid: 0, currentBidder: null, currentBidderName: null }
        : p,
    )
    tx.update(auctionRef(auctionId), { players, currentPlayerId: null, timerEndsAt: null })
  })
}

export async function deleteAuction(auctionId: string) {
  const snap = await getDoc(auctionRef(auctionId))
  if (!snap.exists()) return
  const auction = snap.data() as Auction

  const [teamsSnap, bidsSnap] = await Promise.all([
    getDocs(collection(db, 'auctions', auctionId, 'teams')),
    getDocs(collection(db, 'auctions', auctionId, 'bids')),
  ])

  const batch = writeBatch(db)
  for (const d of teamsSnap.docs) batch.delete(d.ref)
  for (const d of bidsSnap.docs) batch.delete(d.ref)
  // Without this, a manager's assignedAuctions would keep pointing at a
  // deleted auction — the exact "shows an ID, no title" symptom this app
  // already has a bug for, just from a different cause.
  const managerIds = new Set([...auction.auctionManagerIds, ...auction.teamManagerIds])
  for (const uid of managerIds) {
    batch.update(doc(db, 'users', uid), { assignedAuctions: arrayRemove(auctionId) })
  }
  batch.delete(auctionRef(auctionId))
  await batch.commit()
}

export type { PlayerBids }
