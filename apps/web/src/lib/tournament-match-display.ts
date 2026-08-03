import type { TournamentMatchDoc } from "@/types/firestore";

export function formatMatchTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatMatchPhase(phase: string, playoffRound?: number | null) {
  if (phase === "round_robin") return "Round Robin";
  if (phase === "semifinal") return "Semifinal";
  if (phase === "championship") return "Championship";
  return playoffRound ? `Playoff R${playoffRound}` : phase;
}

export function formatMatchupLabel(match: TournamentMatchDoc): string {
  if (match.phase === "championship") {
    if (
      match.status !== "completed" ||
      !match.homeTeamId ||
      !match.awayTeamId
    ) {
      return "TBD vs TBD";
    }
  }

  if (match.phase === "semifinal") {
    if (
      match.status !== "completed" ||
      !match.homeTeamId ||
      !match.awayTeamId
    ) {
      if (match.homeSeed != null && match.awaySeed != null) {
        return `Seed #${match.homeSeed} vs Seed #${match.awaySeed}`;
      }
      return "TBD vs TBD";
    }
  }

  return `${match.homeTeamName} vs ${match.awayTeamName}`;
}

export function computeTeamRecordFromMatches(
  teamId: string,
  matches: TournamentMatchDoc[]
): { wins: number; losses: number; gamesPlayed: number } {
  let wins = 0;
  let losses = 0;

  for (const match of matches) {
    if (match.status !== "completed" || match.winnerId == null) continue;
    if (match.homeTeamId !== teamId && match.awayTeamId !== teamId) continue;
    if (match.winnerId === teamId) {
      wins += 1;
    } else {
      losses += 1;
    }
  }

  return { wins, losses, gamesPlayed: wins + losses };
}
