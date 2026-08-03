import type { Division } from "@nbbl/shared";
import { generateGameScore } from "./game-rules";

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerId: string | null;
  division: Division;
  phase: string;
}

export interface TeamStanding {
  tournamentId: string;
  division: Division;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  seed: number;
}

export function computeStandings(
  tournamentId: string,
  division: Division,
  teams: { id: string; name: string }[],
  completedMatches: MatchResult[]
): TeamStanding[] {
  const divisionMatches = completedMatches.filter(
    (m) => m.division === division && m.phase === "round_robin"
  );

  const stats = new Map<
    string,
    { wins: number; losses: number; pointsFor: number; pointsAgainst: number; teamName: string }
  >();

  for (const team of teams) {
    stats.set(team.id, {
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      teamName: team.name,
    });
  }

  for (const match of divisionMatches) {
    if (match.winnerId === null) continue;

    const home = stats.get(match.homeTeamId);
    const away = stats.get(match.awayTeamId);
    if (!home || !away) continue;

    home.pointsFor += match.homeScore;
    home.pointsAgainst += match.awayScore;
    away.pointsFor += match.awayScore;
    away.pointsAgainst += match.homeScore;

    if (match.winnerId === match.homeTeamId) {
      home.wins += 1;
      away.losses += 1;
    } else {
      away.wins += 1;
      home.losses += 1;
    }
  }

  const standings: TeamStanding[] = teams.map((team) => {
    const s = stats.get(team.id)!;
    return {
      tournamentId,
      division,
      teamId: team.id,
      teamName: s.teamName,
      wins: s.wins,
      losses: s.losses,
      pointsFor: s.pointsFor,
      pointsAgainst: s.pointsAgainst,
      seed: 0,
    };
  });

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });

  standings.forEach((s, i) => {
    s.seed = i + 1;
  });

  return standings;
}

export function generateDemoScores(
  homeTeamId: string,
  awayTeamId: string,
  slotNumber: number
): { homeScore: number; awayScore: number; winnerId: string } {
  const homeScore = generateGameScore(homeTeamId, slotNumber, 0);
  const awayScore = generateGameScore(awayTeamId, slotNumber, 11);
  const winnerId =
    homeScore >= awayScore ? homeTeamId : awayTeamId;
  return { homeScore, awayScore, winnerId };
}
