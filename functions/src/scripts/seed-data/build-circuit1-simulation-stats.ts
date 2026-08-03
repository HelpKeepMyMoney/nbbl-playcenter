import type { Division, SeedPlayerGameStats } from "@nbbl/shared";
import { CIRCUIT1_PEOPLE, CIRCUIT1_TEAMS } from "./circuit1";
import { CIRCUIT1_TOURNAMENTS } from "./circuit1-tournaments";
import type { SeedTournamentData } from "./circuit1-tournament-types";
import { normalizePlayoffPlaceholders } from "../../tournaments/lib/seed-export";
import { computeStandings, generateDemoScores } from "../../tournaments/lib/standings";
import {
  buildChampionshipMatchup,
  buildPlayoffMatchups,
} from "../../tournaments/lib/playoffs";
import {
  collectBoxScoresByTeam,
  computePlayerStatsFromMatches,
  mergePlayerStatsMaps,
  type PlayerInfo,
} from "../../tournaments/lib/simulate-player-stats";
import { computeTeamStats } from "../../tournaments/lib/simulate-team-stats";
import type { SimulatedMatch } from "../../tournaments/lib/simulate-tournament";
import type { SeedTeamGameStats } from "@nbbl/shared";

export function buildPlayersByTeam(): Map<string, PlayerInfo[]> {
  const slugToTeamId = new Map(
    CIRCUIT1_TEAMS.map((team) => [team.slug, team.id])
  );
  const playersByTeam = new Map<string, PlayerInfo[]>();

  for (const team of CIRCUIT1_TEAMS) {
    playersByTeam.set(team.id, []);
  }

  for (const person of CIRCUIT1_PEOPLE) {
    if (person.type !== "player") continue;
    const teamId = slugToTeamId.get(person.teamSlug);
    if (!teamId) continue;
    const roster = playersByTeam.get(teamId) ?? [];
    roster.push({
      id: person.id,
      teamId,
      overallRating: person.overallRating ?? 75,
    });
    playersByTeam.set(teamId, roster);
  }

  return playersByTeam;
}

export function rescoreRoundRobin(tournament: SeedTournamentData): SeedTournamentData {
  const updatedMatches = tournament.matches.map((match) => {
    if (
      match.phase !== "round_robin" ||
      match.status !== "completed" ||
      !match.homeTeamId ||
      !match.awayTeamId
    ) {
      return match;
    }

    const scores = generateDemoScores(
      match.homeTeamId,
      match.awayTeamId,
      match.slotNumber
    );
    return {
      ...match,
      homeScore: scores.homeScore,
      awayScore: scores.awayScore,
      winnerId: scores.winnerId,
    };
  });

  return { ...tournament, matches: updatedMatches };
}

export function applyPlayoffResults(
  tournament: SeedTournamentData
): SeedTournamentData {
  const rrCompleted = tournament.matches
    .filter(
      (match) =>
        match.phase === "round_robin" &&
        match.status === "completed" &&
        match.homeTeamId &&
        match.awayTeamId &&
        match.homeScore != null &&
        match.awayScore != null &&
        match.winnerId
    )
    .map((match) => ({
      homeTeamId: match.homeTeamId!,
      awayTeamId: match.awayTeamId!,
      homeScore: match.homeScore!,
      awayScore: match.awayScore!,
      winnerId: match.winnerId!,
      division: match.division as Division,
      phase: match.phase,
    }));

  let updatedMatches = [...tournament.matches];
  const teamNameById = new Map(
    CIRCUIT1_TEAMS.map((team) => [team.id, team.name])
  );

  for (const division of ["Boys Division", "Girls Division"] as Division[]) {
    const teamIds =
      division === "Boys Division"
        ? tournament.boysTeamIds
        : tournament.girlsTeamIds;
    const teams = teamIds.map((id) => ({
      id,
      name: teamNameById.get(id) ?? id,
    }));

    const standings = computeStandings(
      tournament.id,
      division,
      teams,
      rrCompleted
    );
    const divisionStandings = standings.map((standing) => ({
      teamId: standing.teamId,
      teamName: standing.teamName,
      seed: standing.seed,
    }));
    const semifinalMatchups = buildPlayoffMatchups(divisionStandings);
    const semifinalWinners: { teamId: string; teamName: string }[] = [];

    for (const matchup of semifinalMatchups) {
      if (
        matchup.homeSeed == null ||
        matchup.awaySeed == null ||
        !matchup.homeTeamId ||
        !matchup.awayTeamId
      ) {
        continue;
      }

      const matchIndex = updatedMatches.findIndex(
        (match) =>
          match.division === division &&
          match.phase === "semifinal" &&
          match.homeSeed === matchup.homeSeed &&
          match.awaySeed === matchup.awaySeed
      );
      if (matchIndex === -1) continue;

      const slotNumber = updatedMatches[matchIndex]!.slotNumber;
      const scores = generateDemoScores(
        matchup.homeTeamId,
        matchup.awayTeamId,
        slotNumber
      );
      updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex]!,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        homeTeamName: matchup.homeTeamName,
        awayTeamName: matchup.awayTeamName,
        homeScore: scores.homeScore,
        awayScore: scores.awayScore,
        winnerId: scores.winnerId,
        status: "completed",
      };
      semifinalWinners.push({
        teamId: scores.winnerId,
        teamName:
          scores.winnerId === matchup.homeTeamId
            ? matchup.homeTeamName
            : matchup.awayTeamName,
      });
    }

    const championshipMatchup = buildChampionshipMatchup(semifinalWinners);
    const championshipIndex = updatedMatches.findIndex(
      (match) => match.division === division && match.phase === "championship"
    );
    if (
      championshipMatchup &&
      championshipIndex !== -1 &&
      championshipMatchup.homeTeamId &&
      championshipMatchup.awayTeamId
    ) {
      const slotNumber = updatedMatches[championshipIndex]!.slotNumber;
      const scores = generateDemoScores(
        championshipMatchup.homeTeamId,
        championshipMatchup.awayTeamId,
        slotNumber
      );
      updatedMatches[championshipIndex] = {
        ...updatedMatches[championshipIndex]!,
        homeTeamId: championshipMatchup.homeTeamId,
        awayTeamId: championshipMatchup.awayTeamId,
        homeTeamName: championshipMatchup.homeTeamName,
        awayTeamName: championshipMatchup.awayTeamName,
        homeScore: scores.homeScore,
        awayScore: scores.awayScore,
        winnerId: scores.winnerId,
        status: "completed",
      };
    }
  }

  return { ...tournament, matches: updatedMatches };
}

export function rescoreTournament(tournament: SeedTournamentData): SeedTournamentData {
  const sanitized = sanitizeTournamentMatches(tournament);
  const rescored = rescoreRoundRobin(sanitized);
  if (!shouldApplyPlayoffResults(rescored)) {
    return rescored;
  }
  return applyPlayoffResults(rescored);
}

function sanitizeTournamentMatches(
  tournament: SeedTournamentData
): SeedTournamentData {
  const rrMatches = tournament.matches.filter((match) => match.phase === "round_robin");
  const rrCompleted = rrMatches.filter((match) => match.status === "completed").length;
  if (rrCompleted === rrMatches.length) {
    return tournament;
  }

  return normalizePlayoffPlaceholders(tournament);
}

function shouldApplyPlayoffResults(tournament: SeedTournamentData): boolean {
  const rrMatches = tournament.matches.filter((match) => match.phase === "round_robin");
  const rrCompleted = rrMatches.filter((match) => match.status === "completed").length;
  if (rrCompleted === 0) return false;

  const playoffMatches = tournament.matches.filter(
    (match) => match.phase !== "round_robin"
  );
  const playoffCompleted = playoffMatches.filter(
    (match) => match.status === "completed"
  ).length;

  return rrCompleted === rrMatches.length || playoffCompleted > 0;
}

export function toSimulatedMatches(tournament: SeedTournamentData): SimulatedMatch[] {
  return tournament.matches
    .filter(
      (match) =>
        match.status === "completed" &&
        match.homeTeamId &&
        match.awayTeamId &&
        match.homeScore != null &&
        match.awayScore != null &&
        match.winnerId
    )
    .map((match) => ({
      id: `${tournament.id}_slot_${match.slotNumber}`,
      tournamentId: tournament.id,
      division: match.division,
      phase: match.phase,
      slotNumber: match.slotNumber,
      scheduledStartAt: match.scheduledStartAt,
      homeTeamId: match.homeTeamId!,
      awayTeamId: match.awayTeamId!,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      homeScore: match.homeScore!,
      awayScore: match.awayScore!,
      winnerId: match.winnerId!,
    }));
}

export interface Circuit1SimulationStats {
  tournaments: SeedTournamentData[];
  playerStats: Record<string, SeedPlayerGameStats>;
  teamStats: Record<string, SeedTeamGameStats>;
  completedMatchCount: number;
}

export function buildCircuit1SimulationStats(
  tournaments: SeedTournamentData[] = CIRCUIT1_TOURNAMENTS
): Circuit1SimulationStats {
  const playersByTeam = buildPlayersByTeam();
  const rescoredTournaments = tournaments.map((tournament) =>
    rescoreTournament(tournament)
  );
  const allMatches: SimulatedMatch[] = [];
  const mergedPlayerStats = new Map<
    string,
    { gameSeasonStats: SeedPlayerGameStats["gameSeasonStats"]; gameLog: SeedPlayerGameStats["gameLog"] }
  >();

  for (const tournament of rescoredTournaments) {
    const matches = toSimulatedMatches(tournament);
    allMatches.push(...matches);
    const tournamentStats = computePlayerStatsFromMatches(
      playersByTeam,
      matches,
      tournament.id
    );
    mergePlayerStatsMaps(mergedPlayerStats, tournamentStats);
  }

  const playerStats = Object.fromEntries(mergedPlayerStats) as Record<
    string,
    SeedPlayerGameStats
  >;
  const boxScoresByTeam = collectBoxScoresByTeam(mergedPlayerStats, playersByTeam);
  const teamIds = [
    ...new Set(
      rescoredTournaments.flatMap((tournament) => [
        ...tournament.boysTeamIds,
        ...tournament.girlsTeamIds,
      ])
    ),
  ];
  const teamStats: Record<string, SeedTeamGameStats> = {};
  for (const teamId of teamIds) {
    teamStats[teamId] = computeTeamStats(
      teamId,
      allMatches,
      boxScoresByTeam.get(teamId) ?? []
    );
  }

  return {
    tournaments: rescoredTournaments,
    playerStats,
    teamStats,
    completedMatchCount: allMatches.length,
  };
}
