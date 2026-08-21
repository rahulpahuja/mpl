import { arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { syncTeamAcrossAllAuctions } from './auctions'
import type { RosterPlayer, Team } from '../types'

export async function createTeam(
  teamName: string,
  managerId: string,
  managerName: string,
  logoId?: string | null,
  jerseyColor?: string | null,
  logoImage?: string | null,
): Promise<string> {
  const teamId = crypto.randomUUID()
  const team: Omit<Team, 'createdAt'> = {
    teamId,
    teamName,
    managerId,
    managerName,
    logoId: logoId ?? null,
    jerseyColor: jerseyColor ?? null,
    logoImage: logoImage ?? null,
  }
  await setDoc(doc(db, 'teams', teamId), { ...team, createdAt: serverTimestamp() })
  return teamId
}

export async function updateTeam(
  teamId: string,
  updates: Partial<
    Pick<Team, 'teamName' | 'managerId' | 'managerName' | 'logoId' | 'jerseyColor' | 'logoImage'>
  >,
) {
  await updateDoc(doc(db, 'teams', teamId), updates)
  await syncBrandingIfChanged(teamId, updates)
}

// Setting an uploaded logo clears the preset logoId, and vice versa —
// mirrors the photo/avatar mutual exclusivity in lib/users.ts.
export async function updateTeamLogoImage(teamId: string, logoImage: string | null) {
  await updateDoc(doc(db, 'teams', teamId), { logoImage, logoId: null })
  await syncBrandingIfChanged(teamId, { logoImage, logoId: null })
}

// Pushes a name/logo/jerseyColor change out to every auction this team has
// already been added to — see syncTeamAcrossAllAuctions's doc comment for
// why that snapshot doesn't update on its own. Re-reads the doc rather than
// trusting `updates` so a partial update (e.g. updateTeamLogoImage, which
// only ever touches logo fields) still syncs a complete, current snapshot.
async function syncBrandingIfChanged(
  teamId: string,
  updates: Partial<Pick<Team, 'teamName' | 'managerName' | 'logoId' | 'jerseyColor' | 'logoImage'>>,
) {
  if (
    !(
      'teamName' in updates ||
      'managerName' in updates ||
      'logoId' in updates ||
      'logoImage' in updates ||
      'jerseyColor' in updates
    )
  ) {
    return
  }
  const snap = await getDoc(doc(db, 'teams', teamId))
  if (!snap.exists()) return
  const team = snap.data() as Team
  await syncTeamAcrossAllAuctions(teamId, {
    name: team.teamName,
    logoId: team.logoId ?? null,
    logoImage: team.logoImage ?? null,
    jerseyColor: team.jerseyColor ?? null,
    managerName: team.managerName ?? null,
  })
}

// Persistent squad management — the pool a match's Playing XI is picked
// from, independent of any auction (see RosterPlayer's doc comment).
export async function addToRoster(teamId: string, player: RosterPlayer) {
  const snap = await getDoc(doc(db, 'teams', teamId))
  if (!snap.exists()) throw new Error('Team not found')
  const team = snap.data() as Team
  if ((team.roster ?? []).some((p) => p.playerId === player.playerId)) {
    throw new Error(`${player.name} is already on this team's roster`)
  }
  await updateDoc(doc(db, 'teams', teamId), { roster: arrayUnion(player) })
}

export async function removeFromRoster(teamId: string, player: RosterPlayer) {
  await updateDoc(doc(db, 'teams', teamId), { roster: arrayRemove(player) })
}

export async function updateRosterEntry(teamId: string, playerId: string, updates: Partial<RosterPlayer>) {
  const snap = await getDoc(doc(db, 'teams', teamId))
  if (!snap.exists()) throw new Error('Team not found')
  const team = snap.data() as Team
  const roster = (team.roster ?? []).map((p) => (p.playerId === playerId ? { ...p, ...updates } : p))
  await updateDoc(doc(db, 'teams', teamId), { roster })
}
