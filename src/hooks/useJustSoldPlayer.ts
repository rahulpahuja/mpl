import { useEffect, useRef, useState } from 'react'
import type { Auction, Player, TeamManagerEntry } from '../types'

export interface JustSoldPlayer {
  // Every player who just sold together — more than one when the lead
  // player (the one that was currentPlayerId) is part of a combo lot (see
  // the Player.comboId doc comment), since the whole group sells as a unit.
  players: Player[]
  team: TeamManagerEntry | null
}

// markSold clears `currentPlayerId` back to null in the same transaction that
// flips the player's status to 'sold' (see lib/auctions.ts), so by the time
// any page re-renders there's no "current player" left to show a sold moment
// for. This hook watches for that currentPlayerId transition and hands back
// the player that just left the block — for exactly one render, until the
// caller (SoldCelebration) calls `clear()` once its animation finishes.
export function useJustSoldPlayer(auction: Auction | null | undefined) {
  const [sold, setSold] = useState<JustSoldPlayer | null>(null)
  const prevPlayerIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!auction) return
    const prevId = prevPlayerIdRef.current
    const currentId = auction.currentPlayerId

    if (!initializedRef.current) {
      initializedRef.current = true
      prevPlayerIdRef.current = currentId
      return
    }

    if (prevId && prevId !== currentId) {
      const player = auction.players.find((p) => p.playerId === prevId)
      if (player && player.status === 'sold') {
        const players = player.comboId
          ? auction.players.filter(
              (p) =>
                p.comboId === player.comboId &&
                p.status === 'sold' &&
                p.currentBidder === player.currentBidder,
            )
          : [player]
        const team = auction.teamManagers.find((tm) => tm.managerId === player.currentBidder) ?? null
        setSold({ players, team })
      }
    }
    prevPlayerIdRef.current = currentId
  }, [auction])

  return { sold, clear: () => setSold(null) }
}
