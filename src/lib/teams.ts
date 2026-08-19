import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { syncTeamAcrossAllAuctions } from './auctions'
import type { Team } from '../types'

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
  updates: Partial<Pick<Team, 'teamName' | 'logoId' | 'jerseyColor' | 'logoImage'>>,
) {
  if (!('teamName' in updates || 'logoId' in updates || 'logoImage' in updates || 'jerseyColor' in updates)) {
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
  })
}
