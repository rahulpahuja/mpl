import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
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
