import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Team } from '../types'

export async function createTeam(teamName: string, managerId: string, managerName: string): Promise<string> {
  const teamId = crypto.randomUUID()
  const team: Omit<Team, 'createdAt'> = {
    teamId,
    teamName,
    managerId,
    managerName,
  }
  await setDoc(doc(db, 'teams', teamId), { ...team, createdAt: serverTimestamp() })
  return teamId
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Pick<Team, 'teamName' | 'managerId' | 'managerName'>>,
) {
  await updateDoc(doc(db, 'teams', teamId), updates)
}
