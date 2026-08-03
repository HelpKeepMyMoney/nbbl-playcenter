import type { Division, MatchPhase } from "@nbbl/shared";
import { TOURNAMENT_DEFAULTS } from "@nbbl/shared";
import type { RoundRobinMatch } from "./round-robin";

export interface UnscheduledMatch {
  division: Division;
  phase: MatchPhase;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeSeed?: number | null;
  awaySeed?: number | null;
  cycle?: number;
  round?: number;
  playoffRound?: number;
}

export interface ScheduledMatch extends UnscheduledMatch {
  slotNumber: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
}

export interface ScheduleConfig {
  date: string;
  startTime: string;
  lunchBreakMinutes: number;
  breakAfterGame: number;
  gameDurationMin?: number;
  slotIntervalMin?: number;
}

function parseLocalDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function computeSlotStart(
  config: ScheduleConfig,
  slotNumber: number
): Date {
  const gameDurationMin = config.gameDurationMin ?? TOURNAMENT_DEFAULTS.gameDurationMin;
  const slotIntervalMin = config.slotIntervalMin ?? TOURNAMENT_DEFAULTS.slotIntervalMin;
  void gameDurationMin;

  let offsetMin = (slotNumber - 1) * slotIntervalMin;
  if (slotNumber > config.breakAfterGame) {
    offsetMin += config.lunchBreakMinutes;
  }

  return addMinutes(parseLocalDateTime(config.date, config.startTime), offsetMin);
}

export function interleaveAndSchedule(
  boysMatches: UnscheduledMatch[],
  girlsMatches: UnscheduledMatch[],
  config: ScheduleConfig
): ScheduledMatch[] {
  const interleaved: UnscheduledMatch[] = [];
  const maxLen = Math.max(boysMatches.length, girlsMatches.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < boysMatches.length) interleaved.push(boysMatches[i]);
    if (i < girlsMatches.length) interleaved.push(girlsMatches[i]);
  }

  const gameDurationMin = config.gameDurationMin ?? TOURNAMENT_DEFAULTS.gameDurationMin;

  return interleaved.map((match, index) => {
    const slotNumber = index + 1;
    const start = computeSlotStart(config, slotNumber);
    const end = addMinutes(start, gameDurationMin);
    return {
      ...match,
      slotNumber,
      scheduledStartAt: toIso(start),
      scheduledEndAt: toIso(end),
    };
  });
}

export function roundRobinToUnscheduled(
  division: Division,
  matches: RoundRobinMatch[]
): UnscheduledMatch[] {
  return matches.map((m) => ({
    division,
    phase: "round_robin" as const,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeTeamName: m.homeTeamName,
    awayTeamName: m.awayTeamName,
    cycle: m.cycle,
    round: m.round,
  }));
}

export function schedulePlayoffMatches(
  playoffMatches: UnscheduledMatch[],
  config: ScheduleConfig,
  startSlot: number
): ScheduledMatch[] {
  const gameDurationMin = config.gameDurationMin ?? TOURNAMENT_DEFAULTS.gameDurationMin;

  return playoffMatches.map((match, index) => {
    const slotNumber = startSlot + index;
    const start = computeSlotStart(config, slotNumber);
    const end = addMinutes(start, gameDurationMin);
    return {
      ...match,
      slotNumber,
      scheduledStartAt: toIso(start),
      scheduledEndAt: toIso(end),
    };
  });
}

export function interleavePlayoffs(
  boysPlayoffs: UnscheduledMatch[],
  girlsPlayoffs: UnscheduledMatch[]
): UnscheduledMatch[] {
  const interleaved: UnscheduledMatch[] = [];
  const maxLen = Math.max(boysPlayoffs.length, girlsPlayoffs.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < boysPlayoffs.length) interleaved.push(boysPlayoffs[i]);
    if (i < girlsPlayoffs.length) interleaved.push(girlsPlayoffs[i]);
  }
  return interleaved;
}
