import { z } from "zod";

export const participantTypes = [
  "player",
  "coach",
  "parent",
  "official",
  "admin",
  "staff",
] as const;

export const createParticipantSchema = z.object({
  type: z.enum(participantTypes),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  dateOfBirth: z.string().optional(),
  organizationId: z.string().min(1),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
});

export const updateParticipantSchema = createParticipantSchema.partial().extend({
  id: z.string().min(1),
  status: z.enum(["active", "pending", "inactive"]).optional(),
});

export const softDeleteParticipantSchema = z.object({
  id: z.string().min(1),
});

export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;
