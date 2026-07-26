import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAuction } from '../hooks/useAuction'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { addPlayers, addTeamToAuction, setBidIncrement, updateAuctionStatus } from '../lib/auctions'

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
  const { teams } = useTeamsRegistry()

  const [playerName, setPlayerName] = useState('')
  const [playerPosition, setPlayerPosition] = useState('')
  const [playerBasePrice, setPlayerBasePrice] = useState('')
  const [csvText, setCsvText] = useState('')

  const [teamSearch, setTeamSearch] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [purse, setPurse] = useState('1000')
  const [maxPlayers, setMaxPlayers] = useState('15')

  const [increment, setIncrement] = useState(auction?.bidIncrement?.toString() ?? '10')

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

  async function handleAddPlayer() {
    if (!playerName.trim() || !auctionId) return
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
  }

  async function handleImportCsv() {
    if (!csvText.trim() || !auctionId) return
    const players = parseCsv(csvText)
    if (players.length === 0) return
    await addPlayers(auctionId, players)
    setCsvText('')
  }

  async function handleAddTeam() {
    if (!selectedTeamId || !auctionId) return
    const team = teams.find((t) => t.teamId === selectedTeamId)
    if (!team) return
    await addTeamToAuction(auctionId, team, Number(purse) || 0, Number(maxPlayers) || 15)
    setSelectedTeamId('')
    setTeamSearch('')
    setPurse('1000')
    setMaxPlayers('15')
  }

  async function handleSaveIncrement() {
    if (!auctionId) return
    await setBidIncrement(auctionId, Number(increment) || 10)
  }

  async function handleGoLive() {
    if (!auctionId) return
    await updateAuctionStatus(auctionId, 'live')
  }

  return (
    <Layout>
      <div className="space-y-10">
        <div className="flex items-center justify-between">
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
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Bid increment</h2>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              value={increment}
              onChange={(e) => setIncrement(e.target.value)}
              className="w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleSaveIncrement}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Save
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Player roster</h2>

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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Add player
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
              className="mt-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Import
            </button>
          </div>

          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            {auction.players.map((p) => (
              <li key={p.playerId} className="flex justify-between py-2">
                <span className="text-gray-900 dark:text-gray-100">
                  {p.name} <span className="text-gray-500">({p.position})</span>
                </span>
                <span className="text-gray-500">Base: {p.basePrice}</span>
              </li>
            ))}
            {auction.players.length === 0 && (
              <li className="py-2 text-gray-500">No players added yet.</li>
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Team managers</h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add an existing team to this auction. Teams are created once from the Admin Dashboard
            and can be reused across multiple auctions.
          </p>
          <input
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder="Search teams by name or manager..."
            className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Select team...</option>
              {availableTeams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName} ({t.managerName})
                </option>
              ))}
            </select>
            <input
              type="number"
              value={purse}
              onChange={(e) => setPurse(e.target.value)}
              placeholder="Purse"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
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
          {availableTeams.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {teamSearch
                ? `No teams match "${teamSearch}".`
                : 'No teams available to add. Create one from the Admin Dashboard first.'}
            </p>
          )}

          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            {auction.teamManagers.map((tm) => (
              <li key={tm.teamId} className="flex justify-between py-2">
                <span className="text-gray-900 dark:text-gray-100">{tm.name}</span>
                <span className="text-gray-500">
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
