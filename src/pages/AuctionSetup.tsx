import { Timestamp } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { AuctionBackground } from '../components/AuctionBackground'
import { TeamAvatar } from '../components/TeamAvatar'
import { useAuction } from '../hooks/useAuction'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { useUsers } from '../hooks/useUsers'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  addPlayers,
  addTeamToAuction,
  applyBasePriceToAllPlayers,
  applyCommonPurseToAllTeams,
  applyMaxPlayersToAllTeams,
  removePlayer,
  updateAuctionSettings,
  updateAuctionStatus,
  updatePlayerBasePrice,
} from '../lib/auctions'
import { assignUserToAuction, promoteViewerToPlayer } from '../lib/users'
import { createTeam } from '../lib/teams'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'
import type { PlayingRole, UserRole } from '../types'

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  auctionManager: 'Auction Manager',
  manager: 'Captain',
  player: 'Player',
  viewer: 'Viewer',
}

const DEFAULT_AUCTION_BG_COLOR = '#1e293b'

function parseMaxPlayers(value: string): number {
  const n = Number(value)
  if (value.trim() === '' || Number.isNaN(n)) return 15
  return Math.max(0, Math.trunc(n))
}

function parseCsv(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, position, basePrice] = line.split(',').map((s) => s.trim())
      return { playerId: crypto.randomUUID(), name, position, basePrice: Number(basePrice) || 0 }
    })
    .filter((p) => p.name)
}

export function AuctionSetup() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  usePageTitle(auction ? `${auction.name} · Setup` : 'Auction setup')
  const { teams } = useTeamsRegistry()
  const { users } = useUsers()

  const [playerName, setPlayerName] = useState('')
  const [playerPosition, setPlayerPosition] = useState('')
  const [playerBasePrice, setPlayerBasePrice] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const addingPlayerRef = useRef(false)
  const [csvText, setCsvText] = useState('')
  const [importingCsv, setImportingCsv] = useState(false)
  const importingCsvRef = useRef(false)

  const [viewerSearch, setViewerSearch] = useState('')
  const [selectedViewerId, setSelectedViewerId] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [registeredBasePrices, setRegisteredBasePrices] = useState<Record<string, string>>({})
  const [registeredPlayerSearch, setRegisteredPlayerSearch] = useState('')
  const [addingRegisteredPlayerId, setAddingRegisteredPlayerId] = useState<string | null>(null)
  const addingRegisteredPlayerRef = useRef<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null)
  const removingPlayerRef = useRef<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [editingBasePriceId, setEditingBasePriceId] = useState<string | null>(null)
  const [editBasePrice, setEditBasePrice] = useState('')
  const [savingBasePriceId, setSavingBasePriceId] = useState<string | null>(null)
  const [bulkBasePrice, setBulkBasePrice] = useState('')
  const [applyingBulkBasePrice, setApplyingBulkBasePrice] = useState(false)
  const [bulkBasePriceError, setBulkBasePriceError] = useState<string | null>(null)

  const [teamSearch, setTeamSearch] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [purse, setPurse] = useState('1000')
  const [maxPlayers, setMaxPlayers] = useState('15')
  const [newTeamNames, setNewTeamNames] = useState<Record<string, string>>({})
  const [creatingTeamFor, setCreatingTeamFor] = useState<string | null>(null)

  const [increment, setIncrement] = useState('10')
  const [timerSeconds, setTimerSeconds] = useState('30')
  const [bgColor, setBgColor] = useState(DEFAULT_AUCTION_BG_COLOR)
  const [applyingPurse, setApplyingPurse] = useState(false)
  const [purseError, setPurseError] = useState<string | null>(null)
  const [applyingMaxPlayers, setApplyingMaxPlayers] = useState(false)
  const [maxPlayersError, setMaxPlayersError] = useState<string | null>(null)

  // Re-sync only when landing on a (possibly different) auction, not on every live update.
  useEffect(() => {
    if (auction) {
      setIncrement(String(auction.bidIncrement))
      setTimerSeconds(String(auction.timerDurationSeconds))
      setBgColor(auction.bgColor || DEFAULT_AUCTION_BG_COLOR)
    }
  }, [auction?.auctionId])

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-500">Loading...</p>
      </Layout>
    )
  }

  if (!auction || !auctionId) {
    return (
      <Layout>
        <p className="text-gray-500">Auction not found.</p>
      </Layout>
    )
  }

  const openPlayerCount = auction.players.filter((p) => p.status === 'open').length
  const rosterUids = new Set(auction.players.map((p) => p.playerId))
  // Every signed-in user is a candidate, not just role=player/viewer — plenty of
  // real users only ever hold a Team Manager/Auction Manager/Admin role (that's
  // in fact the common case) and still need to be addable as a player without
  // that changing their existing role. Only a Viewer gets auto-promoted to
  // Player on add (see handleAddRegisteredPlayer); everyone else keeps their role.
  const allRegisteredPlayers = users.filter((u) => !rosterUids.has(u.uid))
  const registeredPlayers = allRegisteredPlayers.filter((u) => {
    const q = registeredPlayerSearch.trim().toLowerCase()
    if (!q) return true
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.userCode?.toLowerCase().includes(q)
    )
  })
  const viewerCandidates = users
    .filter((u) => u.role === 'viewer')
    .filter((u) => {
      const q = viewerSearch.trim().toLowerCase()
      if (!q) return true
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    })
    .sort((a, b) => Number(b.playerRequested) - Number(a.playerRequested))
  const playerRequestCount = users.filter((u) => u.role === 'viewer' && u.playerRequested).length

  const auctionTeamIds = new Set(auction.teamManagers.map((tm) => tm.teamId))
  const availableTeams = teams
    .filter((t) => !auctionTeamIds.has(t.teamId))
    .filter((t) => {
      const q = teamSearch.trim().toLowerCase()
      if (!q) return true
      return (
        t.teamName.toLowerCase().includes(q) || t.managerName.toLowerCase().includes(q)
      )
    })

  const managerUidsWithTeam = new Set(teams.map((t) => t.managerId))
  const managersWithoutTeam = users.filter(
    (u) => u.role === 'manager' && !managerUidsWithTeam.has(u.uid),
  )

  async function handleAddPlayer() {
    // A double-click fires both event handlers before React re-renders the
    // `disabled` button, so `addingPlayer` state alone can't stop the second
    // call — it's still reading the stale (false) value from its own render's
    // closure. A ref is mutated synchronously, so the second call sees it.
    if (!playerName.trim() || !auctionId || addingPlayerRef.current) return
    addingPlayerRef.current = true
    setAddingPlayer(true)
    try {
      await addPlayers(auctionId, [
        {
          playerId: crypto.randomUUID(),
          name: playerName.trim(),
          position: playerPosition.trim(),
          basePrice: Number(playerBasePrice) || 0,
        },
      ])
      setPlayerName('')
      setPlayerPosition('')
      setPlayerBasePrice('')
    } finally {
      addingPlayerRef.current = false
      setAddingPlayer(false)
    }
  }

  async function handlePromoteViewer() {
    if (!selectedViewerId) return
    setPromoting(true)
    try {
      await promoteViewerToPlayer(selectedViewerId)
      setSelectedViewerId('')
      setViewerSearch('')
    } finally {
      setPromoting(false)
    }
  }

  async function handleApproveRequest(uid: string) {
    setPromoting(true)
    try {
      await promoteViewerToPlayer(uid)
    } finally {
      setPromoting(false)
    }
  }

  async function handleAddRegisteredPlayer(
    uid: string,
    name: string,
    assignedAuctions: string[],
    role: UserRole,
    playingRole: PlayingRole | undefined,
  ) {
    if (!auctionId || addingRegisteredPlayerRef.current) return
    addingRegisteredPlayerRef.current = uid
    setAddingRegisteredPlayerId(uid)
    try {
      const basePrice = Number(registeredBasePrices[uid]) || 0
      // Adding a Viewer to a roster means they're playing — auto-promote them to
      // Player instead of making the admin do that as a separate manual step first.
      if (role === 'viewer') {
        await promoteViewerToPlayer(uid)
      }
      // Default to the role set on their profile; falls back to '' ("Not set")
      // if they haven't picked one, same as the manual-add and CSV flows.
      const position = playingRole ? PLAYING_ROLE_LABELS[playingRole] : ''
      await addPlayers(auctionId, [{ playerId: uid, name, position, basePrice }])
      // So the player can see this auction (and what's happening in it) from
      // their own Home page once they log in — mirrors how Team Managers and
      // Auction Managers already see their assigned auctions.
      await assignUserToAuction(uid, auctionId, assignedAuctions, 'player')
      setRegisteredBasePrices((prev) => {
        const next = { ...prev }
        delete next[uid]
        return next
      })
    } finally {
      addingRegisteredPlayerRef.current = null
      setAddingRegisteredPlayerId(null)
    }
  }

  async function handleRemovePlayer(playerId: string) {
    if (!auctionId || removingPlayerRef.current) return
    if (confirmRemoveId !== playerId) {
      setConfirmRemoveId(playerId)
      return
    }
    setConfirmRemoveId(null)
    removingPlayerRef.current = playerId
    setRemovingPlayerId(playerId)
    try {
      await removePlayer(auctionId, playerId)
    } finally {
      removingPlayerRef.current = null
      setRemovingPlayerId(null)
    }
  }

  function startEditBasePrice(playerId: string, currentBasePrice: number) {
    setEditingBasePriceId(playerId)
    setEditBasePrice(String(currentBasePrice))
  }

  async function handleSaveBasePrice(playerId: string) {
    if (!auctionId) return
    setSavingBasePriceId(playerId)
    try {
      await updatePlayerBasePrice(auctionId, playerId, Number(editBasePrice) || 0)
      setEditingBasePriceId(null)
    } finally {
      setSavingBasePriceId(null)
    }
  }

  async function handleApplyBasePriceToAll() {
    if (!auctionId) return
    setBulkBasePriceError(null)
    setApplyingBulkBasePrice(true)
    try {
      await applyBasePriceToAllPlayers(auctionId, Number(bulkBasePrice) || 0)
    } catch (err) {
      setBulkBasePriceError(
        err instanceof Error ? err.message : 'Failed to update base price for all players',
      )
    } finally {
      setApplyingBulkBasePrice(false)
    }
  }

  async function handleImportCsv() {
    if (!csvText.trim() || !auctionId || importingCsvRef.current) return
    const players = parseCsv(csvText)
    if (players.length === 0) return
    importingCsvRef.current = true
    setImportingCsv(true)
    try {
      await addPlayers(auctionId, players)
      setCsvText('')
    } finally {
      importingCsvRef.current = false
      setImportingCsv(false)
    }
  }

  async function handleAddTeam() {
    if (!selectedTeamId || !auctionId) return
    const team = teams.find((t) => t.teamId === selectedTeamId)
    if (!team) return
    await addTeamToAuction(auctionId, team, Number(purse) || 0, parseMaxPlayers(maxPlayers))
    setSelectedTeamId('')
    setTeamSearch('')
    // Purse and max players deliberately keep their values — auctions almost always
    // use the same numbers for every team, so re-typing them per team is pure toil.
  }

  async function handleCreateTeamFor(uid: string, displayName: string) {
    if (!auctionId) return
    const name = (newTeamNames[uid] || `${displayName}'s Team`).trim()
    if (!name) return
    setCreatingTeamFor(uid)
    try {
      const teamId = await createTeam(name, uid, displayName)
      await addTeamToAuction(
        auctionId,
        { teamId, teamName: name, managerId: uid, managerName: displayName, createdAt: Timestamp.now() },
        Number(purse) || 0,
        parseMaxPlayers(maxPlayers),
      )
      setNewTeamNames((prev) => {
        const next = { ...prev }
        delete next[uid]
        return next
      })
    } finally {
      setCreatingTeamFor(null)
    }
  }

  async function handleSaveSettings() {
    if (!auctionId) return
    await updateAuctionSettings(auctionId, {
      bidIncrement: Number(increment) || 10,
      timerDurationSeconds: Number(timerSeconds) || 30,
      bgColor,
    })
  }

  async function handleApplyMaxPlayers() {
    if (!auctionId) return
    setMaxPlayersError(null)
    setApplyingMaxPlayers(true)
    try {
      await applyMaxPlayersToAllTeams(auctionId, parseMaxPlayers(maxPlayers))
    } catch (err) {
      setMaxPlayersError(
        err instanceof Error ? err.message : 'Failed to update max players for all teams',
      )
    } finally {
      setApplyingMaxPlayers(false)
    }
  }

  async function handleApplyCommonPurse() {
    if (!auctionId) return
    setPurseError(null)
    setApplyingPurse(true)
    try {
      await applyCommonPurseToAllTeams(auctionId, Number(purse) || 0)
    } catch (err) {
      setPurseError(err instanceof Error ? err.message : 'Failed to update purse for all teams')
    } finally {
      setApplyingPurse(false)
    }
  }

  async function handleGoLive() {
    if (!auctionId) return
    await updateAuctionStatus(auctionId, 'live')
  }

  return (
    <Layout>
      <AuctionBackground color={auction.bgColor} />
      <div className="space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {auction.name}
            </h1>
            <p className="text-sm text-gray-500">
              Auction ID: <span className="font-mono">{auction.auctionId}</span> · Status:{' '}
              {auction.status}
            </p>
          </div>
          {auction.status === 'draft' && (
            <button
              onClick={handleGoLive}
              disabled={auction.players.length === 0 || auction.teamManagers.length === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Go live
            </button>
          )}
        </div>

        <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Auction settings</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-gray-500">Bid increment</label>
              <input
                type="number"
                value={increment}
                onChange={(e) => setIncrement(e.target.value)}
                className="mt-1 w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">
                Default player timer (seconds)
              </label>
              <input
                type="number"
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(e.target.value)}
                className="mt-1 w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Pre-fills the countdown when a player goes on the block — the Auction Manager
                can still override it per player from the live panel.
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500" htmlFor="auction-bg-color">
                Background color
              </label>
              <input
                id="auction-bg-color"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="mt-1 block h-9 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
              <p className="mt-1 text-xs text-gray-500">
                Themes this auction's setup, live bidding, viewer, and results pages.
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            className="mt-4 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Save
          </button>
        </section>

        <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Player roster</h2>
            <button
              onClick={() => setShowImportDialog(true)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Import players
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <input
              value={playerPosition}
              onChange={(e) => setPlayerPosition(e.target.value)}
              placeholder="Position"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
              value={playerBasePrice}
              onChange={(e) => setPlayerBasePrice(e.target.value)}
              placeholder="Base price"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleAddPlayer}
              disabled={addingPlayer || !playerName.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {addingPlayer ? 'Adding...' : 'Add player'}
            </button>
          </div>

          <div className="mt-4">
            <label className="text-sm text-gray-500">
              Bulk import (CSV: name, position, basePrice — one per line)
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={4}
              placeholder={'Virat Kohli, Batsman, 200\nJasprit Bumrah, Bowler, 250'}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 font-mono"
            />
            <button
              onClick={handleImportCsv}
              disabled={importingCsv || !csvText.trim()}
              className="mt-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {importingCsv ? 'Importing...' : 'Import'}
            </button>
          </div>

          <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Promote a viewer to Player
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Anyone signed in as a Viewer can be promoted to Player, then added to this (or any)
              auction's roster below.
            </p>
            {playerRequestCount > 0 && (
              <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-amber-300 dark:border-amber-700 text-sm">
                {viewerCandidates
                  .filter((v) => v.playerRequested)
                  .map((v) => (
                    <li
                      key={v.uid}
                      className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Avatar
                          name={v.displayName}
                          encryptedPhoto={v.encryptedPhoto}
                          photoURL={v.photoURL}
                          avatarId={v.avatarId}
                        />
                        <span className="min-w-0 break-words">
                          {v.displayName}{' '}
                          <span className="text-gray-500">— {v.phone || v.email}</span>
                          <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            Requested
                          </span>
                        </span>
                      </span>
                      <button
                        onClick={() => handleApproveRequest(v.uid)}
                        disabled={promoting}
                        className="self-start rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 sm:self-auto"
                      >
                        Approve
                      </button>
                    </li>
                  ))}
              </ul>
            )}
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={viewerSearch}
                onChange={(e) => {
                  setViewerSearch(e.target.value)
                  setSelectedViewerId('')
                }}
                placeholder="Search viewers by name, email, phone..."
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2"
              />
              <button
                onClick={handlePromoteViewer}
                disabled={promoting || !selectedViewerId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Promote to Player
              </button>
            </div>
            {viewerSearch && !selectedViewerId && (
              <ul className="mt-2 max-h-40 divide-y divide-gray-200 dark:divide-gray-800 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                {viewerCandidates.map((v) => (
                  <li key={v.uid}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedViewerId(v.uid)
                        setViewerSearch(`${v.displayName} (${v.phone || v.email})`)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Avatar
                        name={v.displayName}
                        encryptedPhoto={v.encryptedPhoto}
                        photoURL={v.photoURL}
                        avatarId={v.avatarId}
                      />
                      <span className="min-w-0 break-words">
                        {v.displayName} <span className="text-gray-500">— {v.phone || v.email}</span>
                        {v.playerRequested && (
                          <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            Requested
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
                {viewerCandidates.length === 0 && (
                  <li className="px-3 py-2 text-gray-500">No "Viewer" users match.</li>
                )}
              </ul>
            )}
          </div>

          {auction.players.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                value={bulkBasePrice}
                onChange={(e) => setBulkBasePrice(e.target.value)}
                placeholder="Base price"
                className="w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleApplyBasePriceToAll}
                disabled={applyingBulkBasePrice || openPlayerCount === 0}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                {applyingBulkBasePrice
                  ? 'Applying...'
                  : `Apply to all ${openPlayerCount} open player${openPlayerCount === 1 ? '' : 's'}`}
              </button>
              {bulkBasePriceError && <p className="text-xs text-red-600">{bulkBasePriceError}</p>}
            </div>
          )}

          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200/80 dark:border-gray-800/80">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Position</th>
                  <th className="px-3 py-2 font-medium">Base price</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {auction.players.map((p) => (
                  <tr key={p.playerId}>
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.name}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {p.position || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {editingBasePriceId === p.playerId ? (
                        <input
                          type="number"
                          min={0}
                          autoFocus
                          value={editBasePrice}
                          onChange={(e) => setEditBasePrice(e.target.value)}
                          className="w-24 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                        />
                      ) : (
                        p.basePrice
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 capitalize">
                      {p.status}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.status === 'open' && (
                        <span className="inline-flex items-center gap-2">
                          {editingBasePriceId === p.playerId ? (
                            <>
                              <button
                                onClick={() => setEditingBasePriceId(null)}
                                disabled={savingBasePriceId === p.playerId}
                                className="text-xs font-medium text-gray-500 hover:underline disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveBasePrice(p.playerId)}
                                disabled={savingBasePriceId === p.playerId}
                                className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                              >
                                {savingBasePriceId === p.playerId ? 'Saving...' : 'Save'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEditBasePrice(p.playerId, p.basePrice)}
                              className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                            >
                              Edit
                            </button>
                          )}
                          {confirmRemoveId === p.playerId && (
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              className="text-xs font-medium text-gray-500 hover:underline"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => handleRemovePlayer(p.playerId)}
                            disabled={removingPlayerId !== null}
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                          >
                            {removingPlayerId === p.playerId
                              ? 'Removing...'
                              : confirmRemoveId === p.playerId
                                ? 'Confirm remove?'
                                : 'Remove'}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {auction.players.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-gray-500">
                      No players added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showImportDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowImportDialog(false)}
          >
            <div
              className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Import players
                </h2>
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Search anyone who has signed in and isn't on this roster yet, by name, email,
                phone, or ID. Adding a Viewer auto-promotes them to Player; everyone else keeps
                their existing role.
              </p>
              <input
                autoFocus
                value={registeredPlayerSearch}
                onChange={(e) => setRegisteredPlayerSearch(e.target.value)}
                placeholder="Search by name, email, phone, or ID..."
                className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
              <ul className="mt-3 flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {registeredPlayers.length === 0 && (
                  <li className="py-2 text-gray-500">
                    {allRegisteredPlayers.length === 0
                      ? 'No one has signed in yet.'
                      : 'No users match.'}
                  </li>
                )}
                {registeredPlayers.map((p) => (
                  <li
                    key={p.uid}
                    className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Avatar
                        name={p.displayName}
                        encryptedPhoto={p.encryptedPhoto}
                        photoURL={p.photoURL}
                        avatarId={p.avatarId}
                      />
                      <span className="min-w-0 break-words">
                        {p.displayName}
                        {p.role !== 'player' && (
                          <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            {roleLabel[p.role]}
                          </span>
                        )}
                        {p.playingRole && (
                          <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            {PLAYING_ROLE_LABELS[p.playingRole]}
                          </span>
                        )}
                        <br />
                        <span className="text-xs text-gray-500">
                          {p.userCode ? `ID ${p.userCode} · ` : ''}
                          {p.phone || p.email}
                        </span>
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <input
                        type="number"
                        value={registeredBasePrices[p.uid] ?? ''}
                        onChange={(e) =>
                          setRegisteredBasePrices((prev) => ({ ...prev, [p.uid]: e.target.value }))
                        }
                        placeholder="Base price"
                        className="w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={() =>
                          handleAddRegisteredPlayer(
                            p.uid,
                            p.displayName,
                            p.assignedAuctions,
                            p.role,
                            p.playingRole,
                          )
                        }
                        disabled={addingRegisteredPlayerId !== null}
                        className="whitespace-nowrap rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        {addingRegisteredPlayerId === p.uid ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Team managers</h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add an existing team to this auction. Teams are created once from the Admin Dashboard
            and can be reused across multiple auctions. Purse and max players are a common default
            for every team you add — set them once below.
          </p>
          <input
            value={teamSearch}
            onChange={(e) => {
              setTeamSearch(e.target.value)
              setSelectedTeamId('')
            }}
            placeholder="Search teams by name or manager..."
            className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
          {teamSearch && !selectedTeamId && (
            <ul className="mt-2 max-h-40 divide-y divide-gray-200 dark:divide-gray-800 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
              {availableTeams.map((t) => (
                <li key={t.teamId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeamId(t.teamId)
                      setTeamSearch(`${t.teamName} (${t.managerName})`)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <TeamAvatar teamName={t.teamName} logoId={t.logoId} logoImage={t.logoImage} />
                    <span className="min-w-0 break-words">
                      {t.teamName} <span className="text-gray-500">— {t.managerName}</span>
                    </span>
                  </button>
                </li>
              ))}
              {availableTeams.length === 0 && (
                <li className="px-3 py-2 text-gray-500">No teams match "{teamSearch}".</li>
              )}
            </ul>
          )}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              type="number"
              value={purse}
              onChange={(e) => setPurse(e.target.value)}
              placeholder="Common purse"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
              min={0}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              placeholder="Max players"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleAddTeam}
              disabled={!selectedTeamId}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Add to auction
            </button>
          </div>
          {auction.teamManagers.length > 0 && (
            <div className="mt-2 space-y-2">
              <div>
                <button
                  onClick={handleApplyCommonPurse}
                  disabled={applyingPurse}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {applyingPurse ? 'Applying...' : `Apply ${purse || 0} purse to all ${auction.teamManagers.length} teams already added`}
                </button>
                {purseError && <p className="mt-1 text-xs text-red-600">{purseError}</p>}
              </div>
              <div>
                <button
                  onClick={handleApplyMaxPlayers}
                  disabled={applyingMaxPlayers}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {applyingMaxPlayers
                    ? 'Applying...'
                    : `Apply ${parseMaxPlayers(maxPlayers)} max players to all ${auction.teamManagers.length} teams already added`}
                </button>
                {maxPlayersError && <p className="mt-1 text-xs text-red-600">{maxPlayersError}</p>}
              </div>
            </div>
          )}
          {!teamSearch && availableTeams.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">No existing teams available to add.</p>
          )}

          {managersWithoutTeam.length > 0 && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Team Manager users without a team yet
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Give them a team name to create their team and add it straight to this auction
                (using the purse and max players set above).
              </p>
              <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {managersWithoutTeam.map((m) => (
                  <li
                    key={m.uid}
                    className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Avatar
                        name={m.displayName}
                        encryptedPhoto={m.encryptedPhoto}
                        photoURL={m.photoURL}
                        avatarId={m.avatarId}
                      />
                      <span className="min-w-0 truncate">
                        {m.displayName} <span className="text-gray-500">({m.email})</span>
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <input
                        value={newTeamNames[m.uid] ?? ''}
                        onChange={(e) =>
                          setNewTeamNames((prev) => ({ ...prev, [m.uid]: e.target.value }))
                        }
                        placeholder={`${m.displayName}'s Team`}
                        className="w-48 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={() => handleCreateTeamFor(m.uid, m.displayName)}
                        disabled={creatingTeamFor === m.uid}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        {creatingTeamFor === m.uid ? 'Creating...' : 'Create team & add'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            {auction.teamManagers.map((tm) => (
              <li key={tm.teamId} className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2">
                <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                  <TeamAvatar teamName={tm.name} logoId={tm.logoId} logoImage={tm.logoImage} />
                  <span className="truncate">{tm.name}</span>
                </span>
                <span className="shrink-0 text-gray-500">
                  Purse: {tm.purse} · Max players: {tm.maxPlayers}
                </span>
              </li>
            ))}
            {auction.teamManagers.length === 0 && (
              <li className="py-2 text-gray-500">No teams added yet.</li>
            )}
          </ul>
        </section>
      </div>
    </Layout>
  )
}
