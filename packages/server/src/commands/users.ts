import { ROLE_KEYS, updateFanFavoritesSchema } from "@nbbl/shared";
import { type AuthContext, getDb } from "../context";
import { notFound, permissionDenied } from "../errors";

export async function handleUpdateFanFavorites(
  ctx: AuthContext,
  data: unknown
) {
  requireFanRole(ctx.roleKeys);
  const input = updateFanFavoritesSchema.parse(data);
  const db = getDb();

  for (const teamId of input.favoriteTeamIds) {
    const teamSnap = await db.collection("teams").doc(teamId).get();
    if (!teamSnap.exists) {
      throw notFound(`Team not found: ${teamId}`);
    }
    const team = teamSnap.data()!;
    if (team.tenantId !== ctx.tenantId || team.deletedAt != null) {
      throw notFound(`Team not found: ${teamId}`);
    }
  }

  for (const participantId of input.favoriteParticipantIds) {
    const participantSnap = await db
      .collection("participants")
      .doc(participantId)
      .get();
    if (!participantSnap.exists) {
      throw notFound(`Participant not found: ${participantId}`);
    }
    const participant = participantSnap.data()!;
    if (
      participant.tenantId !== ctx.tenantId ||
      participant.deletedAt != null ||
      participant.type !== "player"
    ) {
      throw notFound(`Player not found: ${participantId}`);
    }
  }

  const now = new Date().toISOString();
  await db.collection("users").doc(ctx.uid).update({
    favoriteTeamIds: input.favoriteTeamIds,
    favoriteParticipantIds: input.favoriteParticipantIds,
    favoriteVideoIds: input.favoriteVideoIds,
    interestedMerchIds: input.interestedMerchIds,
    purchasedMerchIds: input.purchasedMerchIds,
    updatedAt: now,
  });

  return {
    favoriteTeamIds: input.favoriteTeamIds,
    favoriteParticipantIds: input.favoriteParticipantIds,
    favoriteVideoIds: input.favoriteVideoIds,
    interestedMerchIds: input.interestedMerchIds,
    purchasedMerchIds: input.purchasedMerchIds,
  };
}

export function requireFanRole(roleKeys: string[]): void {
  if (!roleKeys.includes(ROLE_KEYS.FAN)) {
    throw permissionDenied("Fan role required");
  }
}
