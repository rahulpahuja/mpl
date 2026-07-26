import {
  arrayUnion,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
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
  await updateDoc(auctionRef(auctionId), {
    status,
    ...(status === 'live' ? { startTime: serverTimestamp() } : {}),
  })
}

export async function setBidIncrement(auctionId: string, bidIncrement: number) {
  await updateDoc(auctionRef(auctionId), { bidIncrement })
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
    if (player.status !== 'open' && player.status !== 'active') {
      throw new Error('Player is not open for bidding')
    }

    const manager = auction.teamManagers.find((tm) => tm.managerId === managerId)
    if (!manager) throw new Error('Manager is not registered for this auction')

    const minAcceptable = player.currentBid > 0 ? player.currentBid + auction.bidIncrement : player.basePrice
    if (amount < minAcceptable) {
      throw new Error(`Bid must be at least ${minAcceptable}`)
    }
    if (amount > manager.remainingTokens) {
      throw new Error('Insufficient tokens for this bid')
    }
    const squadSize = auction.players.filter(
      (p) => p.currentBidder === managerId && p.status === 'sold',
    ).length
    if (squadSize >= manager.maxPlayers) {
      throw new Error(`${manager.name} has already reached its ${manager.maxPlayers}-player limit`)
    }

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

export type { PlayerBids }
