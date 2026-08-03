import type { Firestore } from "firebase-admin/firestore";
import type { PlayerGameLogEntry, SeedTeamGameStats } from "@nbbl/shared";
import type { SimulatedMatch } from "./simulate-tournament";

const EMPTY_TEAM_STATS: SeedTeamGameStats = {
  seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
  pointsPerGame: 0,
  fieldGoalPct: 0,
  threePointPct: 0,
};

export function computeTeamStats(
  teamId: string,
  matches: SimulatedMatch[],
  boxScores: PlayerGameLogEntry[]
): SeedTeamGameStats {
  const teamMatches = matches.filter(
    (m) => m.homeTeamId === teamId || m.awayTeamId === teamId
  );

  if (teamMatches.length === 0) return { ...EMPTY_TEAM_STATS };

  let wins = 0;
  let losses = 0;
  let totalPoints = 0;

  for (const match of teamMatches) {
    const isHome = match.homeTeamId === teamId;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    totalPoints += teamScore;
    if (match.winnerId === teamId) wins += 1;
    else losses += 1;
  }

  let fgMade = 0;
  let fgAtt = 0;
  let threeMade = 0;
  let threeAtt = 0;
  for (const entry of boxScores) {
    fgMade += entry.fgMade;
    fgAtt += entry.fgAtt;
    threeMade += entry.threeMade;
    threeAtt += entry.threeAtt;
  }

  return {
    seasonStats: {
      gamesPlayed: teamMatches.length,
      wins,
      losses,
    },
    pointsPerGame: Number((totalPoints / teamMatches.length).toFixed(1)),
    fieldGoalPct: fgAtt > 0 ? Number((fgMade / fgAtt).toFixed(3)) : 0,
    threePointPct: threeAtt > 0 ? Number((threeMade / threeAtt).toFixed(3)) : 0,
  };
}

export async function resetTeamGameStats(
  db: Firestore,
  teamIds: string[],
  actorId: string
): Promise<void> {
  const batch = db.batch();
  for (const teamId of teamIds) {
    batch.update(db.collection("teams").doc(teamId), {
      seasonStats: EMPTY_TEAM_STATS.seasonStats,
      pointsPerGame: 0,
      fieldGoalPct: 0,
      threePointPct: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
    });
  }
  await batch.commit();
}

export async function simulateTeamStats(
  db: Firestore,
  actorId: string,
  teamIds: string[],
  matches: SimulatedMatch[],
  boxScoresByTeam: Map<string, PlayerGameLogEntry[]>
): Promise<Record<string, SeedTeamGameStats>> {
  await resetTeamGameStats(db, teamIds, actorId);

  const results: Record<string, SeedTeamGameStats> = {};
  const batch = db.batch();

  for (const teamId of teamIds) {
    const stats = computeTeamStats(
      teamId,
      matches,
      boxScoresByTeam.get(teamId) ?? []
    );
    results[teamId] = stats;
    batch.update(db.collection("teams").doc(teamId), {
      seasonStats: stats.seasonStats,
      pointsPerGame: stats.pointsPerGame,
      fieldGoalPct: stats.fieldGoalPct,
      threePointPct: stats.threePointPct,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
    });
  }

  await batch.commit();
  return results;
}
