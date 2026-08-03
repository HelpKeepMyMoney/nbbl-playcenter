import type { Division } from "@nbbl/shared";
import {
  computeTournamentGameCounts,
  TOURNAMENT_DEFAULTS,
  type CreateTournamentDraftInput,
} from "@nbbl/shared";
import { generateRoundRobin } from "./round-robin";
import {
  interleaveAndSchedule,
  interleavePlayoffs,
  roundRobinToUnscheduled,
  schedulePlayoffMatches,
  type ScheduledMatch,
  type ScheduleConfig,
} from "./schedule";
import { buildPlaceholderPlayoffs } from "./playoffs";

export interface TeamInfo {
  id: string;
  name: string;
  division: Division;
}

export interface TournamentConfig extends CreateTournamentDraftInput {
  seasonId: string;
  facilityId: string;
  courtId: string;
}

export interface GeneratedTournament {
  config: TournamentConfig;
  totalGames: number;
  breakAfterGame: number;
  rrTotal: number;
  matches: ScheduledMatch[];
  boysTeamIds: string[];
  girlsTeamIds: string[];
}

export function generateTournamentSchedule(
  input: CreateTournamentDraftInput,
  teams: TeamInfo[],
  seasonId: string
): GeneratedTournament {
  const boysTeams = teams
    .filter((t) => t.division === "Boys Division")
    .sort((a, b) => a.name.localeCompare(b.name));
  const girlsTeams = teams
    .filter((t) => t.division === "Girls Division")
    .sort((a, b) => a.name.localeCompare(b.name));

  if (boysTeams.length !== 4 || girlsTeams.length !== 4) {
    throw new Error("Tournament requires exactly 4 boys and 4 girls teams");
  }

  const cycles = input.timesEachTeamPlaysOthers;
  const counts = computeTournamentGameCounts(cycles);

  const boysRR = generateRoundRobin(boysTeams, cycles);
  const girlsRR = generateRoundRobin(girlsTeams, cycles);

  const scheduleConfig: ScheduleConfig = {
    date: input.date,
    startTime: input.startTime,
    lunchBreakMinutes: input.lunchBreakMinutes,
    breakAfterGame: counts.breakAfterGame,
  };

  const boysUnscheduled = roundRobinToUnscheduled("Boys Division", boysRR);
  const girlsUnscheduled = roundRobinToUnscheduled("Girls Division", girlsRR);

  const rrScheduled = interleaveAndSchedule(
    boysUnscheduled,
    girlsUnscheduled,
    scheduleConfig
  );

  const boysPlayoffs = buildPlaceholderPlayoffs("Boys Division");
  const girlsPlayoffs = buildPlaceholderPlayoffs("Girls Division");
  const playoffUnscheduled = interleavePlayoffs(boysPlayoffs, girlsPlayoffs);

  const playoffScheduled = schedulePlayoffMatches(
    playoffUnscheduled,
    scheduleConfig,
    rrScheduled.length + 1
  );

  const config: TournamentConfig = {
    ...input,
    seasonId,
    facilityId: TOURNAMENT_DEFAULTS.facilityId,
    courtId: TOURNAMENT_DEFAULTS.courtId,
  };

  return {
    config,
    totalGames: counts.totalGames,
    breakAfterGame: counts.breakAfterGame,
    rrTotal: counts.rrTotal,
    matches: [...rrScheduled, ...playoffScheduled],
    boysTeamIds: boysTeams.map((t) => t.id),
    girlsTeamIds: girlsTeams.map((t) => t.id),
  };
}
