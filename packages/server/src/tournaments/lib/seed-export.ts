import * as fs from "fs";
import * as path from "path";

export interface SeedTournamentData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  timesEachTeamPlaysOthers: number;
  lunchBreakMinutes: number;
  breakAfterGame: number;
  totalGames: number;
  seasonId: string;
  facilityId: string;
  courtId: string;
  status: string;
  boysTeamIds: string[];
  girlsTeamIds: string[];
  matches: SeedMatchData[];
}

export interface SeedMatchData {
  division: string;
  phase: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  slotNumber: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  cycle?: number;
  round?: number;
  playoffRound?: number;
  homeSeed?: number | null;
  awaySeed?: number | null;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string | null;
}

const SEED_TYPES_FILENAME = "circuit1-tournament-types.ts";
const SEED_DATA_FILENAME = "circuit1-tournaments.ts";

function getSeedDataDir(): string {
  return path.resolve(__dirname, "../../../src/scripts/seed-data");
}

function getSeedDataPath(): string {
  return path.join(getSeedDataDir(), SEED_DATA_FILENAME);
}

export function serializeTournamentsSeed(
  tournaments: SeedTournamentData[]
): string {
  const json = JSON.stringify(tournaments, null, 2);
  return `// Auto-generated — do not edit manually
import type { SeedTournamentData } from "./circuit1-tournament-types";

export const CIRCUIT1_TOURNAMENTS: SeedTournamentData[] = ${json};

/** Championship tournament (last in season). */
export const CIRCUIT1_TOURNAMENT: SeedTournamentData =
  CIRCUIT1_TOURNAMENTS.find((t) => t.title.includes("Championship")) ??
  CIRCUIT1_TOURNAMENTS[CIRCUIT1_TOURNAMENTS.length - 1];
`;
}

export function serializeTournamentSeed(data: SeedTournamentData): string {
  return serializeTournamentsSeed([data]);
}

export function normalizePlayoffPlaceholders(
  tournament: SeedTournamentData
): SeedTournamentData {
  return {
    ...tournament,
    matches: tournament.matches.map((match) => {
      if (match.status === "completed") return match;

      if (match.phase === "semifinal") {
        return {
          ...match,
          homeTeamId: null,
          awayTeamId: null,
          homeTeamName:
            match.homeSeed != null ? `Seed #${match.homeSeed}` : "TBD",
          awayTeamName:
            match.awaySeed != null ? `Seed #${match.awaySeed}` : "TBD",
          homeScore: undefined,
          awayScore: undefined,
          winnerId: undefined,
        };
      }

      if (match.phase === "championship") {
        return {
          ...match,
          homeTeamId: null,
          awayTeamId: null,
          homeTeamName: "TBD",
          awayTeamName: "TBD",
          homeScore: undefined,
          awayScore: undefined,
          winnerId: undefined,
        };
      }

      return match;
    }),
  };
}

export function resetTournamentMatchResults(
  tournament: SeedTournamentData
): SeedTournamentData {
  return {
    ...tournament,
    matches: tournament.matches.map((match) => {
      const {
        homeScore: _homeScore,
        awayScore: _awayScore,
        winnerId: _winnerId,
        ...rest
      } = match;
      return { ...rest, status: "scheduled" };
    }),
  };
}

export function readTournamentsFromSeedFile(
  filePath = getSeedDataPath()
): SeedTournamentData[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const marker = "export const CIRCUIT1_TOURNAMENTS: SeedTournamentData[] = ";
  const start = content.indexOf(marker);
  if (start === -1) return [];

  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = jsonStart; i < content.length; i++) {
    const ch = content[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        return JSON.parse(content.slice(jsonStart, i + 1)) as SeedTournamentData[];
      }
    }
  }

  return [];
}

export function writeTournamentsSeedFile(
  tournaments: SeedTournamentData[],
  seedDir = getSeedDataDir()
): void {
  const typesPath = path.join(seedDir, SEED_TYPES_FILENAME);
  const dataPath = path.join(seedDir, SEED_DATA_FILENAME);

  const typesContent = `export interface SeedTournamentData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  timesEachTeamPlaysOthers: number;
  lunchBreakMinutes: number;
  breakAfterGame: number;
  totalGames: number;
  seasonId: string;
  facilityId: string;
  courtId: string;
  status: string;
  boysTeamIds: string[];
  girlsTeamIds: string[];
  matches: SeedMatchData[];
}

export interface SeedMatchData {
  division: string;
  phase: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  slotNumber: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  cycle?: number;
  round?: number;
  playoffRound?: number;
  homeSeed?: number | null;
  awaySeed?: number | null;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string | null;
}
`;

  const sorted = [...tournaments].sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
  );

  fs.writeFileSync(typesPath, typesContent, "utf-8");
  fs.writeFileSync(dataPath, serializeTournamentsSeed(sorted), "utf-8");
}

export function syncTournamentToSeedFile(data: SeedTournamentData): boolean {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    return false;
  }

  const seedDir = getSeedDataDir();
  const normalized = normalizePlayoffPlaceholders(data);
  const existing = readTournamentsFromSeedFile();
  const index = existing.findIndex((t) => t.id === normalized.id);
  if (index === -1) {
    existing.push(normalized);
  } else {
    existing[index] = normalized;
  }

  writeTournamentsSeedFile(existing, seedDir);
  return true;
}
