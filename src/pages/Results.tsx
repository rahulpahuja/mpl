import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { Layout } from '../components/Layout'
import { AuctionBackground } from '../components/AuctionBackground'
import { TeamAvatar } from '../components/TeamAvatar'
import { useAuction } from '../hooks/useAuction'
import { useTeams } from '../hooks/useTeams'
import { useTeamsRegistry } from '../hooks/useTeamsRegistry'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../store/authStore'
import { useUsers } from '../hooks/useUsers'
import { assignUnsoldPlayer } from '../lib/auctions'

export function Results() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const { auction, loading } = useAuction(auctionId)
  usePageTitle(auction ? `${auction.name} · Results` : 'Auction results')
  const teams = useTeams(auctionId)
  // Older auctions' team snapshots predate the managerName field and were
  // never resynced (see lib/teams.ts syncBrandingIfChanged — it only fires
  // on a team edit), so fall back to the live team registry, which always
  // has the current captain name, when the snapshot is missing it.
  const { teams: teamsRegistry } = useTeamsRegistry()
  const { users } = useUsers()
  const user = useAuthStore((s) => s.user)
  const canAssign = user?.role === 'admin' || user?.role === 'auctionManager'
  const [assignTeamByPlayer, setAssignTeamByPlayer] = useState<Record<string, string>>({})
  const [assignAmountByPlayer, setAssignAmountByPlayer] = useState<Record<string, string>>({})
  const [assigning, setAssigning] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  async function handleExportImage() {
    if (!exportRef.current || !auction) return
    setExporting(true)
    try {
      const isDark = document.documentElement.classList.contains('dark')
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: isDark ? '#111827' : '#ffffff',
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${auction.name.replace(/\s+/g, '-').toLowerCase()}-results.png`
      link.click()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export image')
    } finally {
      setExporting(false)
    }
  }

  function handleExportCsv() {
    if (!auction) return
    const escape = (value: string | number) => {
      const str = String(value)
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
    }
    const managerNames = auction.auctionManagerIds
      .map((uid) => users.find((u) => u.uid === uid)?.displayName ?? uid)
      .join('; ')
    const soldPlayers = auction.players.filter((p) => p.status === 'sold')
    const unsoldPlayers = auction.players.filter((p) => p.status === 'unsold')
    const standings = [...teams].sort((a, b) => b.spent - a.spent)

    const rows: (string | number)[][] = [
      ['Auction Name', auction.name],
      ['Auction ID', auction.auctionId],
      ['Status', auction.status],
      ['Auction Manager(s)', managerNames || 'None'],
      ['Background Color', auction.bgColor || 'Default'],
      ['Title Color', auction.titleColor || 'Default'],
      ['Secondary Color', auction.secondaryColor || 'Default'],
      ['Background Image', auction.backgroundImage || 'None'],
      ['Total Players', auction.players.length],
      ['Sold', soldPlayers.length],
      ['Unsold', unsoldPlayers.length],
      ['Exported At', new Date().toISOString()],
      [],
      ['Team Standings'],
      ['Team', 'Captain', 'Balance', 'Spent', 'Initial Purse', 'Players'],
      ...standings.map((t) => [
        t.teamName,
        t.managerName || teamsRegistry.find((r) => r.teamId === t.teamId)?.managerName || '',
        t.balance,
        t.spent,
        t.initialPurse,
        soldPlayers.filter((p) => p.currentBidder === t.managerId).length,
      ]),
      [],
      ['Team Squads'],
      ...standings.flatMap((t) => {
        const captain =
          t.managerName || teamsRegistry.find((r) => r.teamId === t.teamId)?.managerName || ''
        const squad = soldPlayers
          .filter((p) => p.currentBidder === t.managerId)
          .sort((a, b) => b.currentBid - a.currentBid)
        return [
          [`${t.teamName} (Captain: ${captain || 'Unknown'})`],
          ['Player', 'Position', 'Price', 'Unsold → Reassigned'],
          ...squad.map((p) => [p.name, p.position, p.currentBid, p.wasUnsoldAssigned ? 'Yes' : ''] as (
            | string
            | number
          )[]),
          ...(squad.length === 0 ? [['No players acquired.']] : []),
          [],
        ]
      }),
      ['Player Results'],
      ['Player', 'Position', 'Status', 'Team', 'Price'],
      ...auction.players.map((p) => [
        p.name,
        p.position,
        p.status,
        p.status === 'sold' ? p.currentBidderName ?? '' : '',
        p.status === 'sold' ? p.currentBid : '',
      ]),
    ]
    const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${auction.name.replace(/\s+/g, '-').toLowerCase()}-results.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleAssign(playerId: string) {
    const teamId = assignTeamByPlayer[playerId]
    if (!teamId || !auctionId) return
    const raw = assignAmountByPlayer[playerId]
    const amount = raw && raw.trim() !== '' ? Number(raw) : undefined
    setAssigning(true)
    try {
      await assignUnsoldPlayer(auctionId, playerId, teamId, amount)
      setAssignTeamByPlayer((prev) => ({ ...prev, [playerId]: '' }))
      setAssignAmountByPlayer((prev) => ({ ...prev, [playerId]: '' }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign player')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-500">Loading...</p>
      </Layout>
    )
  }

  if (!auction) {
    return (
      <Layout>
        <p className="text-gray-500">No auction found for ID "{auctionId}".</p>
      </Layout>
    )
  }

  const sold = auction.players.filter((p) => p.status === 'sold')
  const unsold = auction.players.filter((p) => p.status === 'unsold')
  const sortedTeams = [...teams].sort((a, b) => b.spent - a.spent)
  const byPriceDesc = [...sold].sort((a, b) => b.currentBid - a.currentBid)
  const topSold = byPriceDesc.slice(0, 3)
  const bottomSold = byPriceDesc.slice(-3).reverse()

  return (
    <Layout>
      <AuctionBackground color={auction.bgColor} imageUrl={auction.backgroundImage} />
      <div className="space-y-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-semibold text-gray-900 dark:text-gray-100"
              style={{ color: auction.titleColor || undefined }}
            >
              {auction.name} — Results
            </h1>
            <p className="text-sm text-gray-500" style={{ color: auction.secondaryColor || undefined }}>
              Auction ID: <span className="font-mono">{auction.auctionId}</span> · {sold.length} sold ·{' '}
              {unsold.length} unsold
            </p>
          </div>
          {auction.status === 'completed' && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportImage}
                disabled={exporting}
                className="rounded-lg btn-glass border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export as image'}
              </button>
              <button
                onClick={handleExportCsv}
                className="rounded-lg btn-glass border px-4 py-2 text-sm font-medium"
              >
                Export as CSV
              </button>
            </div>
          )}
        </div>

        <div ref={exportRef} className="space-y-10">
        <section>
          <h2
            className="text-lg font-medium text-gray-900 dark:text-gray-100"
            style={{ color: auction.titleColor || undefined }}
          >
            Team strength
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTeams.map((team) => {
              const captainName =
                team.managerName || teamsRegistry.find((t) => t.teamId === team.teamId)?.managerName
              // Computed from auction.players rather than trusted from this
              // team's own `players` snapshot — that snapshot is written by
              // a second, non-atomic call (recordTeamPurchase) after the
              // player is marked sold, so it can drift/miss entries (e.g. an
              // unsold-then-assigned player) if that second write fails.
              // auction.players is the one place a sale is always recorded.
              const squad = auction.players
                .filter((p) => p.currentBidder === team.managerId && p.status === 'sold')
                .sort((a, b) => b.currentBid - a.currentBid)
              return (
              <div key={team.teamId} className="glass-card p-4">
                <div className="relative z-[3] flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                    <TeamAvatar
                      teamName={team.teamName}
                      logoId={team.logoId}
                      logoImage={team.logoImage}
                      jerseyColor={team.jerseyColor}
                    />
                    <span className="truncate">{team.teamName}</span>
                  </h3>
                  <span className="shrink-0 text-sm text-gray-500">Balance {team.balance}</span>
                </div>
                {captainName && (
                  <p className="relative z-[3] mt-0.5 truncate text-xs text-gray-500">
                    {captainName} (C)
                  </p>
                )}
                <p className="relative z-[3] mt-1 text-xs text-gray-500">
                  Spent {team.spent} of {team.initialPurse}
                </p>
                <ul className="relative z-[3] mt-3 space-y-1 text-sm">
                  {squad.map((p) => (
                    <li key={p.playerId} className="flex justify-between gap-2 text-gray-600 dark:text-gray-400">
                      <span className="min-w-0 truncate flex items-center gap-1.5">
                        <span className="truncate">{p.name}</span>
                        {p.wasUnsoldAssigned && (
                          <span
                            title="Went unsold, later assigned to this team"
                            className="shrink-0 inline-block h-2 w-2 rounded-full bg-amber-500"
                          />
                        )}
                      </span>
                      <span className="shrink-0 font-mono">{p.currentBid}</span>
                    </li>
                  ))}
                  {squad.length === 0 && (
                    <li className="text-gray-500">No players acquired.</li>
                  )}
                </ul>
              </div>
              )
            })}
            {sortedTeams.length === 0 && (
              <p className="text-sm text-gray-500" style={{ color: auction.secondaryColor || undefined }}>
                No teams registered.
              </p>
            )}
          </div>
        </section>

        {auction.status === 'completed' && topSold.length > 0 && (
          <section>
            <h2
              className="text-lg font-medium text-gray-900 dark:text-gray-100"
              style={{ color: auction.titleColor || undefined }}
            >
              Top sales
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {topSold.map((p, i) => (
                <li key={p.playerId} className="glass-card relative z-[3] p-4">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">#{i + 1}</p>
                  <p className="mt-1 truncate font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.position}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{p.currentBid}</p>
                  <p className="text-xs text-gray-500">Sold to {p.currentBidderName}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {auction.status === 'completed' && sold.length > 3 && bottomSold.length > 0 && (
          <section>
            <h2
              className="text-lg font-medium text-gray-900 dark:text-gray-100"
              style={{ color: auction.titleColor || undefined }}
            >
              Lowest sales
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {bottomSold.map((p, i) => (
                <li key={p.playerId} className="glass-card relative z-[3] p-4">
                  <p className="text-xs font-medium text-gray-500">#{i + 1}</p>
                  <p className="mt-1 truncate font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.position}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{p.currentBid}</p>
                  <p className="text-xs text-gray-500">Sold to {p.currentBidderName}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2
            className="text-lg font-medium text-gray-900 dark:text-gray-100"
            style={{ color: auction.titleColor || undefined }}
          >
            Sold players
          </h2>
          {sold.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500" style={{ color: auction.secondaryColor || undefined }}>
              No players sold yet.
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-2 sm:hidden">
                {sold.map((p) => (
                  <li key={p.playerId} className="glass-card p-3">
                    <div className="relative z-[3] flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.position}</p>
                      </div>
                      <p className="shrink-0 font-mono text-gray-900 dark:text-gray-100">{p.currentBid}</p>
                    </div>
                    <p className="relative z-[3] mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Sold to {p.currentBidderName}
                    </p>
                    {p.wasUnsoldAssigned && (
                      <span
                        title="Went unsold in the auction, later force-assigned to this team"
                        className="relative z-[3] mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Unsold → reassigned
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="glass-card relative z-[3] mt-4 hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="surface-inset text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Player</th>
                      <th className="px-4 py-2 font-medium">Position</th>
                      <th className="px-4 py-2 font-medium">Sold to</th>
                      <th className="px-4 py-2 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {sold.map((p) => (
                      <tr key={p.playerId}>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                          <span className="inline-flex items-center gap-1.5">
                            {p.name}
                            {p.wasUnsoldAssigned && (
                              <span
                                title="Went unsold in the auction, later force-assigned to this team"
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Unsold → reassigned
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{p.position}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {p.currentBidderName}
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">
                          {p.currentBid}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {unsold.length > 0 && (
          <section>
            <h2
              className="text-lg font-medium text-gray-900 dark:text-gray-100"
              style={{ color: auction.titleColor || undefined }}
            >
              Unsold players
            </h2>
            {canAssign ? (
              <ul className="mt-3 space-y-2">
                {unsold.map((p) => (
                  <li
                    key={p.playerId}
                    className="glass-card flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="relative z-[3] min-w-0 break-words text-gray-900 dark:text-gray-100">
                      {p.name} <span className="text-gray-500">({p.position}) · Base {p.basePrice}</span>
                    </span>
                    <div className="relative z-[3] flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        value={assignAmountByPlayer[p.playerId] ?? ''}
                        onChange={(e) =>
                          setAssignAmountByPlayer((prev) => ({ ...prev, [p.playerId]: e.target.value }))
                        }
                        placeholder={`${p.basePrice}`}
                        title="Sell value (defaults to base price if left blank)"
                        className="input-glass w-24 rounded-md px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                      />
                      <select
                        value={assignTeamByPlayer[p.playerId] ?? ''}
                        onChange={(e) =>
                          setAssignTeamByPlayer((prev) => ({ ...prev, [p.playerId]: e.target.value }))
                        }
                        className="input-glass rounded-md px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Assign to team...</option>
                        {auction.teamManagers.map((tm) => (
                          <option key={tm.teamId} value={tm.teamId}>
                            {tm.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(p.playerId)}
                        disabled={assigning || !assignTeamByPlayer[p.playerId]}
                        className="btn-brand rounded-md px-3 py-1 text-xs font-medium"
                      >
                        Assign
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {unsold.map((p) => (
                  <li
                    key={p.playerId}
                    className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm text-gray-600 dark:text-gray-300"
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        </div>
      </div>
    </Layout>
  )
}
