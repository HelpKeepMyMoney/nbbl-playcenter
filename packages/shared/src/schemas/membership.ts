import { z } from "zod";

export const createMembershipPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  monthlyAmount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
});

export const updateMembershipPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  monthlyAmount: z.number().positive().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export const assignPlayerMembershipSchema = z.object({
  participantId: z.string().min(1),
  planId: z.string().min(1),
  effectiveDate: z.string().optional(),
});

export const changePlayerMembershipPlanSchema = z.object({
  membershipId: z.string().min(1),
  planId: z.string().min(1),
});

export const pausePlayerMembershipSchema = z.object({
  membershipId: z.string().min(1),
});

export const resumePlayerMembershipSchema = z.object({
  membershipId: z.string().min(1),
});

export const cancelPlayerMembershipSchema = z.object({
  membershipId: z.string().min(1),
  cancelReason: z.string().max(500).optional(),
});

export const toggleMembershipAutoRenewSchema = z.object({
  membershipId: z.string().min(1),
  autoRenew: z.boolean(),
});

export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>;
export type AssignPlayerMembershipInput = z.infer<typeof assignPlayerMembershipSchema>;
export type ChangePlayerMembershipPlanInput = z.infer<typeof changePlayerMembershipPlanSchema>;
export type PausePlayerMembershipInput = z.infer<typeof pausePlayerMembershipSchema>;
export type ResumePlayerMembershipInput = z.infer<typeof resumePlayerMembershipSchema>;
export type CancelPlayerMembershipInput = z.infer<typeof cancelPlayerMembershipSchema>;
export type ToggleMembershipAutoRenewInput = z.infer<typeof toggleMembershipAutoRenewSchema>;
