import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ROLE_KEYS, updateFanFavoritesSchema } from "@nbbl/shared";
import { getAuthContext, getDb } from "../lib/context";

export const updateFanFavorites = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const ctx = getAuthContext(request.auth);
  const roleKeys = (request.auth.token.roleKeys as string[]) ?? [];
  if (!roleKeys.includes(ROLE_KEYS.FAN)) {
    throw new HttpsError("permission-denied", "Fan role required");
  }

  const input = updateFanFavoritesSchema.parse(request.data);
  const db = getDb();

  for (const teamId of input.favoriteTeamIds) {
    const teamSnap = await db.collection("teams").doc(teamId).get();
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", `Team not found: ${teamId}`);
    }
    const team = teamSnap.data()!;
    if (team.tenantId !== ctx.tenantId || team.deletedAt != null) {
      throw new HttpsError("not-found", `Team not found: ${teamId}`);
    }
  }

  for (const participantId of input.favoriteParticipantIds) {
    const participantSnap = await db
      .collection("participants")
      .doc(participantId)
      .get();
    if (!participantSnap.exists) {
      throw new HttpsError(
        "not-found",
        `Participant not found: ${participantId}`
      );
    }
    const participant = participantSnap.data()!;
    if (
      participant.tenantId !== ctx.tenantId ||
      participant.deletedAt != null ||
      participant.type !== "player"
    ) {
      throw new HttpsError(
        "not-found",
        `Player not found: ${participantId}`
      );
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
});
