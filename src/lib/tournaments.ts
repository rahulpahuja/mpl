import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase'
import { netRunRate } from './matchRules'
import type { Match, Team, Tournament, TournamentStanding } from '../types'

function tournamentRef(tournamentId: string) {
  return doc(db, 'tournaments', tournamentId)
}

export async function createTournament(
  name: string,
  createdBy: string,
  teams: Pick<Team, 'teamId' | 'teamName'>[],
): Promise<string> {
  const tournamentId = crypto.randomUUID()
  const standings: TournamentStanding[] = teams.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    points: 0,
    runsFor: 0,
    oversFor: 0,
    runsAgainst: 0,
    oversAgainst: 0,
    nrr: 0,
  }))
  const tournament: Omit<Tournament, 'createdAt'> = {
    tournamentId,
    name,
    createdBy,
    teamIds: teams.map((t) => t.teamId),
    standings,
  }
  await setDoc(tournamentRef(tournamentId), { ...tournament, createdAt: serverTimestamp() })
  return tournamentId
}

export async function addTeamToTournament(tournamentId: string, team: Pick<Team, 'teamId' | 'teamName'>) {
  const snap = await getDoc(tournamentRef(tournamentId))
  if (!snap.exists()) throw new Error('Tournament not found')
  const tournament = snap.data() as Tournament
  if (tournament.teamIds.includes(team.teamId)) return
  const standings: TournamentStanding[] = [
    ...tournament.standings,
    {
      teamId: team.teamId,
      teamName: team.teamName,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsFor: 0,
      oversFor: 0,
      runsAgainst: 0,
      oversAgainst: 0,
      nrr: 0,
    },
  ]
  await updateDoc(tournamentRef(tournamentId), { teamIds: [...tournament.teamIds, team.teamId], standings })
}

// Overs actually faced count for NRR, except a team all out before using its
// full quota is credited with the full allotted overs instead — the
// standard net-run-rate convention (otherwise collapsing early would
// artificially inflate NRR).
function oversForNrr(innings: NonNullable<Match['innings1']>, oversLimit: number): number {
  return innings.completedReason === 'allOut' ? oversLimit : innings.legalBallsBowled / 6
}

export async function recomputeStandings(tournamentId: string): Promise<void> {
  const [tournamentSnap, matchesSnap] = await Promise.all([
    getDoc(tournamentRef(tournamentId)),
    getDocs(
      query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), where('status', '==', 'completed')),
    ),
  ])
  if (!tournamentSnap.exists()) return
  const tournament = tournamentSnap.data() as Tournament

  const table = new Map<string, TournamentStanding>()
  for (const s of tournament.standings) {
    table.set(s.teamId, {
      ...s,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsFor: 0,
      oversFor: 0,
      runsAgainst: 0,
      oversAgainst: 0,
      nrr: 0,
    })
  }

  for (const matchDoc of matchesSnap.docs) {
    const match = matchDoc.data() as Match
    if (!match.innings1 || !match.innings2) continue
    const team1Id = match.innings1.battingTeamId
    const team2Id = match.innings2.battingTeamId
    const s1 = table.get(team1Id)
    const s2 = table.get(team2Id)
    if (!s1 || !s2) continue

    const overs1 = oversForNrr(match.innings1, match.oversLimit)
    const overs2 = oversForNrr(match.innings2, match.oversLimit)

    s1.played += 1
    s1.runsFor += match.innings1.totalRuns
    s1.oversFor += overs1
    s1.runsAgainst += match.innings2.totalRuns
    s1.oversAgainst += overs2

    s2.played += 1
    s2.runsFor += match.innings2.totalRuns
    s2.oversFor += overs2
    s2.runsAgainst += match.innings1.totalRuns
    s2.oversAgainst += overs1

    if (match.winnerTeamId === team1Id) {
      s1.won += 1
      s1.points += 2
      s2.lost += 1
    } else if (match.winnerTeamId === team2Id) {
      s2.won += 1
      s2.points += 2
      s1.lost += 1
    } else {
      s1.tied += 1
      s2.tied += 1
      s1.points += 1
      s2.points += 1
    }
  }

  const standings = [...table.values()]
    .map((s) => ({ ...s, nrr: netRunRate(s.runsFor, s.oversFor, s.runsAgainst, s.oversAgainst) }))
    .sort((a, b) => b.points - a.points || b.nrr - a.nrr)

  await updateDoc(tournamentRef(tournamentId), { standings })
}
