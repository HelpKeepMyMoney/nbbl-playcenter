import { z } from "zod";

export const tournamentStatuses = ["draft", "active", "archived"] as const;
export const matchPhases = ["round_robin", "semifinal", "championship"] as const;
export const matchStatuses = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const divisions = ["Boys Division", "Girls Division"] as const;

export const createTournamentDraftSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  timesEachTeamPlaysOthers: z.number().int().min(1).max(10),
  lunchBreakMinutes: z.number().int().min(0).max(180),
  seasonId: z.string().min(1).optional(),
});

export const tournamentIdSchema = z.object({
  tournamentId: z.string().min(1),
});

export const updateTournamentSchema = createTournamentDraftSchema.extend({
  tournamentId: z.string().min(1),
});

export const recordMatchResultSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
});

export type CreateTournamentDraftInput = z.infer<
  typeof createTournamentDraftSchema
>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
export type TournamentIdInput = z.infer<typeof tournamentIdSchema>;
export type RecordMatchResultInput = z.infer<typeof recordMatchResultSchema>;
export type TournamentStatus = (typeof tournamentStatuses)[number];
export type MatchPhase = (typeof matchPhases)[number];
export type MatchStatus = (typeof matchStatuses)[number];
export type Division = (typeof divisions)[number];

export const TOURNAMENT_DEFAULTS = {
  gameDurationMin: 7,
  slotIntervalMin: 10,
  facilityId: "facility_nbbl_academy",
  courtId: "court_main",
} as const;

export function computeTournamentGameCounts(cycles: number) {
  const rrPerDivision = 6 * cycles;
  const rrTotal = rrPerDivision * 2;
  const playoffTotal = 6;
  const totalGames = rrTotal + playoffTotal;
  const breakAfterGame = Math.floor(totalGames / 2);
  return { rrPerDivision, rrTotal, playoffTotal, totalGames, breakAfterGame };
}
