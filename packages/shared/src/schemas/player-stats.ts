import { z } from "zod";

export const gameSeasonStatsSchema = z.object({
  gamesPlayed: z.number().int().min(0),
  pointsPerGame: z.number().min(0),
  reboundsPerGame: z.number().min(0),
  assistsPerGame: z.number().min(0),
});

export const playerGameLogEntrySchema = z.object({
  matchId: z.string().min(1),
  tournamentId: z.string().min(1),
  date: z.string().min(1),
  opponent: z.string().min(1),
  result: z.string().min(1),
  win: z.boolean(),
  min: z.number().int().min(0),
  pts: z.number().int().min(0),
  reb: z.number().int().min(0),
  ast: z.number().int().min(0),
  stl: z.number().int().min(0),
  fgMade: z.number().int().min(0),
  fgAtt: z.number().int().min(0),
  threeMade: z.number().int().min(0),
  threeAtt: z.number().int().min(0),
});

export const seedTeamGameStatsSchema = z.object({
  seasonStats: z.object({
    gamesPlayed: z.number().int().min(0),
    wins: z.number().int().min(0),
    losses: z.number().int().min(0),
  }),
  pointsPerGame: z.number().min(0),
  fieldGoalPct: z.number().min(0).max(1),
  threePointPct: z.number().min(0).max(1),
});

export type GameSeasonStats = z.infer<typeof gameSeasonStatsSchema>;
export type PlayerGameLogEntry = z.infer<typeof playerGameLogEntrySchema>;
export type SeedTeamGameStats = z.infer<typeof seedTeamGameStatsSchema>;

export interface SeedPlayerGameStats {
  gameSeasonStats: GameSeasonStats;
  gameLog: PlayerGameLogEntry[];
}
