import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
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
}

// Setting an uploaded logo clears the preset logoId, and vice versa —
// mirrors the photo/avatar mutual exclusivity in lib/users.ts.
export async function updateTeamLogoImage(teamId: string, logoImage: string | null) {
  await updateDoc(doc(db, 'teams', teamId), { logoImage, logoId: null })
}
