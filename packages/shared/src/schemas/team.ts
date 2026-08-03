import { z } from "zod";

export const teamStatuses = ["active", "pending", "inactive"] as const;

export const seasonStatsSchema = z.object({
  gamesPlayed: z.number().int().min(0).default(0),
  wins: z.number().int().min(0).default(0),
  losses: z.number().int().min(0).default(0),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(200),
  organizationId: z.string().min(1),
  ageGroup: z.string().min(1),
  division: z.string().min(1),
  seasonId: z.string().min(1),
  headCoachParticipantId: z.string().optional(),
  logoUrl: z.string().optional(),
  homeFacilityId: z.string().optional(),
  homeBinodeId: z.string().optional(),
  practiceDays: z.array(z.string()).optional(),
  status: z.enum(teamStatuses).default("active"),
  seasonStats: seasonStatsSchema.optional(),
});

export const updateTeamSchema = createTeamSchema.partial().extend({
  id: z.string().min(1),
});

export const assignCoachSchema = z.object({
  teamId: z.string().min(1),
  headCoachParticipantId: z.string().min(1),
});

export const addTeamMemberSchema = z.object({
  teamId: z.string().min(1),
  participantId: z.string().min(1),
  role: z.enum(["player", "coach", "manager"]).default("player"),
});

export const removeTeamMemberSchema = z.object({
  teamId: z.string().min(1),
  membershipId: z.string().min(1),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
