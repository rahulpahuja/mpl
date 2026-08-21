import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { assertUnsoldAssignment, assertValidBid, computeCommonPurseUpdate } from './auctionRules'
import type {
  Auction,
  AuctionTeamStats,
  BattingType,
  BowlingType,
  Handedness,
  Player,
  PlayerBids,
  Team,
  TeamManagerEntry,
} from '../types'

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

// Players grouped into one auction lot via createCombo share a comboId (see
// the Player type doc comment). `matchStatus: true` narrows the group to
// players still sharing `player`'s current status — used while resolving a
// state transition (start/sell/unsell), so a sibling that's already moved
// on for some other reason isn't dragged along. `false` returns every
// member regardless of status — used once a sale has already happened, to
// look back at the whole original lot.
function comboSiblings(players: Player[], player: Player, matchStatus: boolean): Player[] {
  if (!player.comboId) return [player]
  return players.filter(
    (p) => p.comboId === player.comboId && (!matchStatus || p.status === player.status),
  )
}

// Splits `total` into `count` integer shares that sum back to exactly
// `total` — a naive total/count division can lose or gain tokens to
// rounding. The first `remainder` shares absorb one extra token each.
function splitEqually(total: number, count: number): number[] {
  const base = Math.floor(total / count)
  const remainder = total - base * count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
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
  settings: Partial<
    Pick<
      Auction,
      | 'name'
      | 'bidIncrement'
      | 'timerDurationSeconds'
      | 'bgColor'
      | 'titleColor'
      | 'secondaryColor'
      | 'backgroundImage'
    >
  >,
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
  if (maxPlayers < 0) throw new Error('Max players must be 0 or more')
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

// Player name is a snapshot copied into `players` when they're added (see
// addPlayers), not read live from the users collection, so it can go stale
// two ways: a linked player (playerId === their uid, added via "Add
// Registered Player") renames themselves on their profile, or a manually
// typed/CSV-imported player (playerId is a random UUID, no linked account —
// see the players.map comment in AuctionSetup) just has a typo. Unlike
// basePrice/status this is pure identity, so it's editable regardless of the
// player's auction status. Used both by syncPlayerNameAcrossAllAuctions
// (automatic, for linked players) and directly by the Auction Setup UI
// (manual correction, works for any player).
export async function renamePlayer(auctionId: string, playerId: string, name: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) return
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player || player.name === name) return
    tx.update(auctionRef(auctionId), {
      players: auction.players.map((p) => (p.playerId === playerId ? { ...p, name } : p)),
    })
  })
}

// Same staleness story as renamePlayer, for the photo + handedness snapshot
// instead of the name: a linked player's roster entry can be missing these
// (added before the fields existed) or out of date (their profile changed
// since). Called from AuctionSetup, which already holds both the write
// access (Auction Manager) and the read access (users list) needed to
// compare a linked player's roster entry against their live profile.
export async function syncPlayerProfileSnapshot(
  auctionId: string,
  playerId: string,
  snapshot: {
    encryptedPhoto: string | null
    avatarId: string | null
    photoURL: string | null
    photoSourceFilenId: string | null
    battingHandedness: Handedness | null
    bowlingHandedness: Handedness | null
    battingType: BattingType | null
    bowlingType: BowlingType | null
  },
) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) return
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    // Photo change detection: when the source is Filen, compare
    // photoSourceFilenId (stable) rather than the encryptedPhoto bytes
    // (re-encrypted with a fresh random IV every call — see photoSourceFilenId's
    // doc comment on the Player type for why direct comparison would never
    // match and loop forever).
    const photoUnchanged = snapshot.photoSourceFilenId
      ? (player?.photoSourceFilenId ?? null) === snapshot.photoSourceFilenId
      : (player?.encryptedPhoto ?? null) === snapshot.encryptedPhoto &&
        !player?.photoSourceFilenId
    const unchanged =
      player &&
      photoUnchanged &&
      (player.avatarId ?? null) === snapshot.avatarId &&
      (player.photoURL ?? null) === snapshot.photoURL &&
      (player.battingHandedness ?? null) === snapshot.battingHandedness &&
      (player.bowlingHandedness ?? null) === snapshot.bowlingHandedness &&
      (player.battingType ?? null) === snapshot.battingType &&
      (player.bowlingType ?? null) === snapshot.bowlingType
    if (!player || unchanged) return
    tx.update(auctionRef(auctionId), {
      players: auction.players.map((p) => (p.playerId === playerId ? { ...p, ...snapshot } : p)),
    })
  })
}

// Scans every auction for a player entry linked to this uid and pushes the
// new name into it. A full scan (rather than trusting the user's
// assignedAuctions) is deliberate: assignedAuctions has a history of missing
// entries for reasons unrelated to naming (see scripts/backfillAssignedAuctions.cjs),
// and this app's auction count is small enough that scanning all of them is cheap.
export async function syncPlayerNameAcrossAllAuctions(uid: string, name: string) {
  const snap = await getDocs(collection(db, 'auctions'))
  const linkedAuctionIds = snap.docs
    .filter((d) => (d.data() as Auction).players.some((p) => p.playerId === uid))
    .map((d) => d.id)
  await Promise.all(
    linkedAuctionIds.map((auctionId) =>
      renamePlayer(auctionId, uid, name).catch((err) => {
        // Firestore rules only grant write access to an auction's managers,
        // so a player syncing their own name has no permission on auctions
        // they don't manage. Leave those stale rather than failing the
        // profile save — a manager can fix it via Auction Setup's manual
        // rename (see renamePlayer's doc comment).
        if (err?.code !== 'permission-denied') throw err
      }),
    ),
  )
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

// Same "still open" restriction as removePlayer — once a player has gone
// under the hammer, their base price is part of the historical record.
export async function updatePlayerBasePrice(auctionId: string, playerId: string, basePrice: number) {
  if (basePrice < 0) throw new Error('Base price must be 0 or more')
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) return
    if (player.status !== 'open') {
      throw new Error('Only players that are still open can have their base price changed.')
    }
    tx.update(auctionRef(auctionId), {
      players: auction.players.map((p) => (p.playerId === playerId ? { ...p, basePrice } : p)),
    })
  })
}

export async function applyBasePriceToAllPlayers(auctionId: string, basePrice: number) {
  if (basePrice < 0) throw new Error('Base price must be 0 or more')
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    tx.update(auctionRef(auctionId), {
      players: auction.players.map((p) => (p.status === 'open' ? { ...p, basePrice } : p)),
    })
  })
}

// Groups two or more still-open players into a single auction lot: they're
// started, bid on, and sold together as one unit, with the winning price
// split equally across every member (see markSold/splitEqually). Only valid
// while every member is still 'open' — same "hasn't gone under the hammer
// yet" restriction as removePlayer/updatePlayerBasePrice.
export async function createCombo(auctionId: string, playerIds: string[]): Promise<void> {
  if (playerIds.length < 2) throw new Error('A combo needs at least 2 players')
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    for (const id of playerIds) {
      const p = auction.players.find((pl) => pl.playerId === id)
      if (!p) throw new Error('Player not found')
      if (p.status !== 'open') throw new Error(`${p.name} is not open and can't be added to a combo`)
    }
    const comboId = crypto.randomUUID()
    tx.update(auctionRef(auctionId), {
      players: auction.players.map((p) => (playerIds.includes(p.playerId) ? { ...p, comboId } : p)),
    })
  })
}

// Ungroups a combo lot that hasn't gone under the hammer yet, back into
// individual open players.
export async function breakCombo(auctionId: string, comboId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const members = auction.players.filter((p) => p.comboId === comboId)
    if (members.some((p) => p.status !== 'open')) {
      throw new Error('Only a combo where every player is still open can be broken up')
    }
    tx.update(auctionRef(auctionId), {
      players: auction.players.map((p) => (p.comboId === comboId ? { ...p, comboId: null } : p)),
    })
  })
}

export async function addTeamToAuction(
  auctionId: string,
  team: Team,
  purse: number,
  maxPlayers: number,
) {
  if (maxPlayers < 0) throw new Error('Max players must be 0 or more')
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
      logoId: team.logoId ?? null,
      logoImage: team.logoImage ?? null,
      jerseyColor: team.jerseyColor ?? null,
      managerName: team.managerName ?? null,
    }
    tx.update(auctionRef(auctionId), {
      teamManagers: [...auction.teamManagers, entry],
      teamManagerIds: [...auction.teamManagerIds, team.managerId],
    })
    tx.set(teamRef(auctionId, team.teamId), {
      teamId: team.teamId,
      teamName: team.teamName,
      managerId: team.managerId,
      logoId: team.logoId ?? null,
      logoImage: team.logoImage ?? null,
      jerseyColor: team.jerseyColor ?? null,
      managerName: team.managerName ?? null,
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

// TeamManagerEntry.logoId/logoImage/jerseyColor are a snapshot taken at
// addTeamToAuction time (see its doc comment and the Team type) — a logo
// changed afterward on the global team registry never reaches an auction
// already in progress. Called from lib/teams.ts right after a team update,
// mirroring syncPlayerNameAcrossAllAuctions below. Skips (rather than
// throws on) auctions the caller doesn't manage, same reasoning as that
// function — team logos are edited from the global Teams admin page, which
// isn't scoped to a single auction's managers.
async function updateTeamSnapshotInAuction(
  auctionId: string,
  teamId: string,
  snapshot: {
    name?: string
    logoId: string | null
    logoImage: string | null
    jerseyColor: string | null
    managerName?: string | null
  },
) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) return
    const auction = snap.data() as Auction
    if (!auction.teamManagers.some((tm) => tm.teamId === teamId)) return
    tx.update(auctionRef(auctionId), {
      teamManagers: auction.teamManagers.map((tm) =>
        tm.teamId === teamId
          ? {
              ...tm,
              ...(snapshot.name !== undefined ? { name: snapshot.name } : {}),
              logoId: snapshot.logoId,
              logoImage: snapshot.logoImage,
              jerseyColor: snapshot.jerseyColor,
              ...(snapshot.managerName !== undefined ? { managerName: snapshot.managerName } : {}),
            }
          : tm,
      ),
    })
    tx.update(teamRef(auctionId, teamId), {
      ...(snapshot.name !== undefined ? { teamName: snapshot.name } : {}),
      logoId: snapshot.logoId,
      logoImage: snapshot.logoImage,
      jerseyColor: snapshot.jerseyColor,
      ...(snapshot.managerName !== undefined ? { managerName: snapshot.managerName } : {}),
    })
  })
}

export async function syncTeamAcrossAllAuctions(
  teamId: string,
  snapshot: {
    name?: string
    logoId: string | null
    logoImage: string | null
    jerseyColor: string | null
    managerName?: string | null
  },
) {
  const snap = await getDocs(collection(db, 'auctions'))
  const linkedAuctionIds = snap.docs
    .filter((d) => (d.data() as Auction).teamManagers.some((tm) => tm.teamId === teamId))
    .map((d) => d.id)
  await Promise.all(
    linkedAuctionIds.map((auctionId) =>
      updateTeamSnapshotInAuction(auctionId, teamId, snapshot).catch((err) => {
        if (err?.code !== 'permission-denied') throw err
      }),
    ),
  )
}

export async function setCurrentPlayer(auctionId: string, playerId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) throw new Error('Player not found')
    // Combo siblings go under the hammer together — see the Player.comboId
    // doc comment — even though bidding itself only ever targets this one
    // playerId (see placeBid).
    const groupIds = new Set(comboSiblings(auction.players, player, true).map((p) => p.playerId))
    const players = auction.players.map((p) =>
      groupIds.has(p.playerId) ? { ...p, status: 'active' as const } : p,
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
    const groupSize = comboSiblings(auction.players, player, true).length
    assertValidBid(player, manager, amount, auction.bidIncrement, squadSize, groupSize)

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

  // player.currentBid is this member's equal-split share by the time this
  // runs (see markSold/assignUnsoldPlayer) — sum the whole combo group's
  // shares back up to get the full price the team's purse was decremented
  // by. Only folds in siblings still sold to this same team, so a combo
  // member resold individually later doesn't get double-recorded here.
  const group = comboSiblings(auction.players, player, false).filter(
    (p) => p.status === 'sold' && p.currentBidder === player.currentBidder,
  )
  const totalPrice = group.reduce((sum, p) => sum + p.currentBid, 0)

  const teamsSnapRef = teamRef(auctionId, team.teamId)
  const teamSnap = await getDoc(teamsSnapRef)
  if (teamSnap.exists()) {
    const teamData = teamSnap.data() as AuctionTeamStats
    await updateDoc(teamsSnapRef, {
      spent: teamData.spent + totalPrice,
      balance: teamData.balance - totalPrice,
      players: [
        ...teamData.players,
        ...group.map((p) => ({
          playerId: p.playerId,
          playerName: p.name,
          soldAt: p.currentBid,
          ...(p.wasUnsoldAssigned ? { wasUnsoldAssigned: true } : {}),
        })),
      ],
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

    // A combo's siblings never place their own bids (only the lead player,
    // tracked as currentPlayerId, does — see placeBid): winning the lot
    // means every member sells together at an equal share of that one bid.
    const group = comboSiblings(auction.players, player, true)
    const shares = new Map(
      splitEqually(player.currentBid, group.length).map((share, i) => [group[i].playerId, share]),
    )

    const players = auction.players.map((p) =>
      shares.has(p.playerId)
        ? {
            ...p,
            status: 'sold' as const,
            currentBid: shares.get(p.playerId)!,
            currentBidder: player.currentBidder,
            currentBidderName: player.currentBidderName,
          }
        : p,
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

    // An unsold combo (see markUnsold) still has every member sharing
    // comboId and status — assigning any one of them assigns the whole lot,
    // split equally, same as a live-bid win (see markSold).
    const group = comboSiblings(auction.players, player, true)
    if (group.some((p) => p.status !== 'unsold')) {
      throw new Error('Only unsold players can be assigned directly to a team')
    }
    const price = amount ?? group.reduce((sum, p) => sum + p.basePrice, 0)
    const soldCount = auction.players.filter(
      (p) => p.currentBidder === team.managerId && p.status === 'sold',
    ).length
    assertUnsoldAssignment(player, team, price, soldCount, group.length)

    const shares = new Map(splitEqually(price, group.length).map((share, i) => [group[i].playerId, share]))
    const players = auction.players.map((p) =>
      shares.has(p.playerId)
        ? {
            ...p,
            status: 'sold' as const,
            currentBid: shares.get(p.playerId)!,
            currentBidder: team.managerId,
            currentBidderName: team.name,
            wasUnsoldAssigned: true,
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

// Undoes a mistaken sale (whether via markSold or assignUnsoldPlayer):
// refunds the buying team's purse by the sold price, drops the player from
// that team's roster, and puts them back in the open queue to be
// re-auctioned. Unlike markSold/recordTeamPurchase's split write, this does
// the auction doc and the teams/{teamId} stats doc in one transaction so the
// two can't drift if the second write fails.
export async function revertSale(auctionId: string, playerId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) throw new Error('Player not found')
    if (player.status !== 'sold') throw new Error('Only sold players can be reverted')
    if (!player.currentBidder) throw new Error('Sold player has no bidder on record')

    const team = auction.teamManagers.find((tm) => tm.managerId === player.currentBidder)
    if (!team) throw new Error('Team not found in this auction')

    const teamStatsRef = teamRef(auctionId, team.teamId)
    const teamStatsSnap = await tx.get(teamStatsRef)

    // Only folds in siblings still sold to this same team — a combo member
    // resold individually to a different team later (via assignUnsoldPlayer
    // after going unsold) shouldn't be swept up in this revert.
    const group = comboSiblings(auction.players, player, false).filter(
      (p) => p.status === 'sold' && p.currentBidder === player.currentBidder,
    )
    const groupIds = new Set(group.map((p) => p.playerId))
    const price = group.reduce((sum, p) => sum + p.currentBid, 0)

    const players = auction.players.map((p) =>
      groupIds.has(p.playerId)
        ? {
            ...p,
            status: 'open' as const,
            currentBid: 0,
            currentBidder: null,
            currentBidderName: null,
            wasUnsoldAssigned: false,
          }
        : p,
    )
    const teamManagers = auction.teamManagers.map((tm) =>
      tm.teamId === team.teamId
        ? { ...tm, tokensSpent: tm.tokensSpent - price, remainingTokens: tm.remainingTokens + price }
        : tm,
    )
    tx.update(auctionRef(auctionId), { players, teamManagers })

    if (teamStatsSnap.exists()) {
      const teamData = teamStatsSnap.data() as AuctionTeamStats
      tx.update(teamStatsRef, {
        spent: teamData.spent - price,
        balance: teamData.balance + price,
        players: teamData.players.filter((p) => !groupIds.has(p.playerId)),
      })
    }

    // set+merge (not update) since a combo sibling never got its own bids
    // doc created — only the lead player did, via placeBid — so `playerId`
    // here might not have an existing doc to update.
    tx.set(
      bidsRef(auctionId, playerId),
      { finalBidder: null, finalAmount: null, awardedAt: null },
      { merge: true },
    )
  })
}

export async function markUnsold(auctionId: string, playerId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) throw new Error('Player not found')
    const groupIds = new Set(comboSiblings(auction.players, player, true).map((p) => p.playerId))
    const players = auction.players.map((p) =>
      groupIds.has(p.playerId)
        ? { ...p, status: 'unsold' as const, currentBid: 0, currentBidder: null, currentBidderName: null }
        : p,
    )
    tx.update(auctionRef(auctionId), { players, currentPlayerId: null, timerEndsAt: null })
  })
}

// Reverses an accidental "Mark unsold" — puts the player back into the open
// queue so they can be started again like any other pending player. Only
// valid from 'unsold': a sold player has already affected a team's purse and
// squad, which this doesn't unwind (see removePlayer's similar 'open'-only
// guard).
export async function returnPlayerToQueue(auctionId: string, playerId: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef(auctionId))
    if (!snap.exists()) throw new Error('Auction not found')
    const auction = snap.data() as Auction
    const player = auction.players.find((p) => p.playerId === playerId)
    if (!player) throw new Error('Player not found')
    if (player.status !== 'unsold') {
      throw new Error('Only unsold players can be returned to the queue')
    }
    const groupIds = new Set(comboSiblings(auction.players, player, true).map((p) => p.playerId))
    const players = auction.players.map((p) =>
      groupIds.has(p.playerId) ? { ...p, status: 'open' as const } : p,
    )
    tx.update(auctionRef(auctionId), { players })
  })
}

// Emergency reset for a live auction that's gone wrong (wrong bid recorded,
// corrupted state, etc.) — wipes all bidding progress back to a fresh
// 'draft' so the Auction Manager can hit "Go Live" and start over, without
// losing the roster, teams, or team registrations themselves.
export async function restartAuction(auctionId: string) {
  const snap = await getDoc(auctionRef(auctionId))
  if (!snap.exists()) return
  const auction = snap.data() as Auction

  const [teamsSnap, bidsSnap] = await Promise.all([
    getDocs(collection(db, 'auctions', auctionId, 'teams')),
    getDocs(collection(db, 'auctions', auctionId, 'bids')),
  ])

  const batch = writeBatch(db)
  for (const d of bidsSnap.docs) batch.delete(d.ref)
  for (const d of teamsSnap.docs) {
    const stats = d.data() as AuctionTeamStats
    batch.update(d.ref, { spent: 0, balance: stats.initialPurse, players: [] })
  }
  const players = auction.players.map((p) => ({
    ...p,
    status: 'open' as const,
    currentBid: 0,
    currentBidder: null,
    currentBidderName: null,
    wasUnsoldAssigned: false,
  }))
  const teamManagers = auction.teamManagers.map((tm) => ({
    ...tm,
    tokensSpent: 0,
    remainingTokens: tm.purse,
  }))
  batch.update(auctionRef(auctionId), {
    players,
    teamManagers,
    currentPlayerId: null,
    timerEndsAt: null,
    status: 'draft',
  })
  await batch.commit()
}

export async function deleteAuction(auctionId: string) {
  const snap = await getDoc(auctionRef(auctionId))
  if (!snap.exists()) return
  const auction = snap.data() as Auction

  const [teamsSnap, bidsSnap] = await Promise.all([
    getDocs(collection(db, 'auctions', auctionId, 'teams')),
    getDocs(collection(db, 'auctions', auctionId, 'bids')),
  ])

  // Managers are always real accounts by construction, but a roster player's
  // playerId may be a random UUID with no linked account (manually
  // typed/CSV-imported — see the players.map comment in AuctionSetup).
  // batch.update() on a nonexistent doc fails the *entire* batch, so verify
  // which player ids actually have a user doc first via chunked `in`
  // queries (Firestore caps `in` at 10 values).
  const managerIds = new Set([...auction.auctionManagerIds, ...auction.teamManagerIds])
  const candidatePlayerIds = auction.players
    .map((p) => p.playerId)
    .filter((id) => !managerIds.has(id))
  const linkedPlayerIds: string[] = []
  for (let i = 0; i < candidatePlayerIds.length; i += 10) {
    const chunk = candidatePlayerIds.slice(i, i + 10)
    const usersSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
    linkedPlayerIds.push(...usersSnap.docs.map((d) => d.id))
  }

  const batch = writeBatch(db)
  for (const d of teamsSnap.docs) batch.delete(d.ref)
  for (const d of bidsSnap.docs) batch.delete(d.ref)
  // Without this, a manager's or linked player's assignedAuctions would keep
  // pointing at a deleted auction — the exact "shows an ID, no title"
  // symptom this app already has a bug for, just from a different cause.
  const uidsToClean = new Set([...managerIds, ...linkedPlayerIds])
  for (const uid of uidsToClean) {
    batch.update(doc(db, 'users', uid), { assignedAuctions: arrayRemove(auctionId) })
  }
  batch.delete(auctionRef(auctionId))
  await batch.commit()
}

// Recreates a full copy of an auction under a new id — same settings,
// players (reset to open, no bid history, no combos), and teams (reset
// wallets, empty rosters) — so an Auction Manager can rerun an identical
// draft without manually re-entering everything.
export async function duplicateAuction(auctionId: string): Promise<string> {
  const snap = await getDoc(auctionRef(auctionId))
  if (!snap.exists()) throw new Error('Auction not found')
  const source = snap.data() as Auction

  const newAuctionId = generateAuctionId()
  const players: Player[] = source.players.map((p) => ({
    ...p,
    currentBid: 0,
    currentBidder: null,
    currentBidderName: null,
    status: 'open',
    wasUnsoldAssigned: false,
    comboId: null,
  }))
  const teamManagers: TeamManagerEntry[] = source.teamManagers.map((tm) => ({
    ...tm,
    tokensSpent: 0,
    remainingTokens: tm.purse,
  }))

  const batch = writeBatch(db)
  batch.set(auctionRef(newAuctionId), {
    auctionId: newAuctionId,
    name: `${source.name} (copy)`,
    status: 'draft',
    createdAt: serverTimestamp(),
    startTime: null,
    createdBy: source.createdBy,
    bidIncrement: source.bidIncrement,
    auctionManagerIds: source.auctionManagerIds,
    teamManagerIds: source.teamManagerIds,
    currentPlayerId: null,
    timerDurationSeconds: source.timerDurationSeconds,
    timerEndsAt: null,
    players,
    teamManagers,
    bgColor: source.bgColor ?? null,
    titleColor: source.titleColor ?? null,
    secondaryColor: source.secondaryColor ?? null,
    backgroundImage: source.backgroundImage ?? null,
  })
  for (const tm of teamManagers) {
    batch.set(teamRef(newAuctionId, tm.teamId), {
      teamId: tm.teamId,
      teamName: tm.name,
      managerId: tm.managerId,
      logoId: tm.logoId ?? null,
      logoImage: tm.logoImage ?? null,
      jerseyColor: tm.jerseyColor ?? null,
      managerName: tm.managerName ?? null,
      initialPurse: tm.purse,
      spent: 0,
      balance: tm.purse,
      players: [],
    })
  }
  // Same reasoning as addTeamToAuction — without this, a manager's Home page
  // wouldn't show the new copy even though they're already registered on it.
  const notifyUids = new Set([...source.auctionManagerIds, ...source.teamManagerIds])
  for (const uid of notifyUids) {
    batch.update(doc(db, 'users', uid), { assignedAuctions: arrayUnion(newAuctionId) })
  }
  await batch.commit()
  return newAuctionId
}

export type { PlayerBids }
