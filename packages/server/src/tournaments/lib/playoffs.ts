import type { Division } from "@nbbl/shared";
import type { UnscheduledMatch } from "./schedule";

export interface StandingSeed {
  teamId: string;
  teamName: string;
  seed: number;
}

export interface PlayoffMatchup {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeSeed?: number | null;
  awaySeed?: number | null;
  playoffRound: number;
}

export function findPlayoffMatchBySeeds<
  T extends {
    division: string;
    phase: string;
    homeSeed?: number | null;
    awaySeed?: number | null;
  },
>(
  matches: T[],
  division: string,
  phase: string,
  homeSeed: number,
  awaySeed: number
): T | undefined {
  return matches.find(
    (match) =>
      match.division === division &&
      match.phase === phase &&
      match.homeSeed === homeSeed &&
      match.awaySeed === awaySeed
  );
}

export function buildPlayoffMatchups(seeds: StandingSeed[]): PlayoffMatchup[] {
  if (seeds.length < 4) {
    throw new Error("Playoffs require at least 4 seeded teams");
  }

  const sorted = [...seeds].sort((a, b) => a.seed - b.seed);
  const [s1, s2, s3, s4] = sorted;

  return [
    {
      homeTeamId: s1.teamId,
      awayTeamId: s4.teamId,
      homeTeamName: s1.teamName,
      awayTeamName: s4.teamName,
      homeSeed: 1,
      awaySeed: 4,
      playoffRound: 1,
    },
    {
      homeTeamId: s2.teamId,
      awayTeamId: s3.teamId,
      homeTeamName: s2.teamName,
      awayTeamName: s3.teamName,
      homeSeed: 2,
      awaySeed: 3,
      playoffRound: 1,
    },
  ];
}

export function buildChampionshipMatchup(
  semifinalWinners: { teamId: string; teamName: string }[]
): PlayoffMatchup | null {
  if (semifinalWinners.length < 2) return null;
  const [w1, w2] = semifinalWinners;
  return {
    homeTeamId: w1.teamId,
    awayTeamId: w2.teamId,
    homeTeamName: w1.teamName,
    awayTeamName: w2.teamName,
    playoffRound: 2,
  };
}

export function playoffMatchupsToUnscheduled(
  division: Division,
  matchups: PlayoffMatchup[],
  phase: "semifinal" | "championship"
): UnscheduledMatch[] {
  return matchups.map((m) => ({
    division,
    phase,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeTeamName: m.homeTeamName,
    awayTeamName: m.awayTeamName,
    homeSeed: m.homeSeed ?? null,
    awaySeed: m.awaySeed ?? null,
    playoffRound: m.playoffRound,
  }));
}

/** Semifinals use seed slots; championship teams are TBD until semis are played. */
export function buildPlaceholderPlayoffs(division: Division): UnscheduledMatch[] {
  const semis: UnscheduledMatch[] = [
    {
      division,
      phase: "semifinal",
      homeTeamId: null,
      awayTeamId: null,
      homeTeamName: "Seed #1",
      awayTeamName: "Seed #4",
      homeSeed: 1,
      awaySeed: 4,
      playoffRound: 1,
    },
    {
      division,
      phase: "semifinal",
      homeTeamId: null,
      awayTeamId: null,
      homeTeamName: "Seed #2",
      awayTeamName: "Seed #3",
      homeSeed: 2,
      awaySeed: 3,
      playoffRound: 1,
    },
  ];

  const championship: UnscheduledMatch = {
    division,
    phase: "championship",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamName: "TBD",
    awayTeamName: "TBD",
    homeSeed: null,
    awaySeed: null,
    playoffRound: 2,
  };

  return [...semis, championship];
}
