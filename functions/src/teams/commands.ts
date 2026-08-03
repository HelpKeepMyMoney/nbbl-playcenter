import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  addTeamMemberSchema,
  assignCoachSchema,
  baseDocumentFields,
  bumpDocument,
  type BaseDocument,
  createTeamSchema,
  PERMISSIONS,
  removeTeamMemberSchema,
  updateTeamSchema,
} from "@nbbl/shared";
import {
  getAuthContext,
  getDb,
  refreshTeamStats,
  requirePermission,
  writeAuditLog,
} from "../lib/context";

async function getParticipantName(participantId: string): Promise<string> {
  const snap = await getDb().collection("participants").doc(participantId).get();
  if (!snap.exists) return "Unknown";
  const p = snap.data()!;
  return `${p.firstName} ${p.lastName}`;
}

async function updateTeamPlayerCount(teamId: string): Promise<number> {
  const memberships = await getDb()
    .collection("memberships")
    .where("teamId", "==", teamId)
    .where("role", "==", "player")
    .where("deletedAt", "==", null)
    .get();
  const count = memberships.size;
  await getDb().collection("teams").doc(teamId).update({
    playerCount: count,
    updatedAt: new Date().toISOString(),
  });
  return count;
}

export const createTeam = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TEAMS_WRITE);

  const input = createTeamSchema.parse(request.data);
  const id = getDb().collection("teams").doc().id;
  const base = baseDocumentFields(
    id,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    input.status
  );

  let headCoachName: string | null = null;
  if (input.headCoachParticipantId) {
    headCoachName = await getParticipantName(input.headCoachParticipantId);
  }

  const doc = {
    ...base,
    name: input.name,
    organizationId: input.organizationId,
    ageGroup: input.ageGroup,
    division: input.division,
    seasonId: input.seasonId,
    headCoachParticipantId: input.headCoachParticipantId ?? null,
    headCoachName,
    assistantCoachName: null,
    teamManagerName: null,
    playerCount: 0,
    logoUrl: input.logoUrl ?? null,
    homeFacilityId: input.homeFacilityId ?? null,
    homeBinodeId: input.homeBinodeId ?? "PHX-01",
    homeFacilityName: "NBBL Academy",
    practiceDays: input.practiceDays ?? ["Mon", "Wed", "Fri"],
    seasonStats: input.seasonStats ?? {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
    },
  };

  await getDb().collection("teams").doc(id).set(doc);
  await refreshTeamStats(ctx.tenantId);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "team",
    entityId: id,
    action: "created",
    summary: `Team created: ${input.name}`,
  });

  return { id, team: doc };
});

export const updateTeam = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TEAMS_WRITE);

  const input = updateTeamSchema.parse(request.data);
  const ref = getDb().collection("teams").doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Team not found");
  }
  const existing = snap.data()!;
  if (existing.tenantId !== ctx.tenantId) {
    throw new HttpsError("permission-denied", "Tenant mismatch");
  }

  const { id: _id, ...patch } = input;
  let headCoachName = existing.headCoachName;
  if (patch.headCoachParticipantId) {
    headCoachName = await getParticipantName(patch.headCoachParticipantId);
  }

  const updated = bumpDocument(
    { ...existing } as BaseDocument & Record<string, unknown>,
    ctx.uid,
    {
      ...patch,
      headCoachName,
    } as Record<string, unknown>
  );
  await ref.set(updated, { merge: false });
  await refreshTeamStats(ctx.tenantId);

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "team",
    entityId: input.id,
    action: "updated",
    summary: `Team updated: ${String(updated.name)}`,
  });

  return { team: updated };
});

export const assignCoach = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TEAMS_WRITE);
  const input = assignCoachSchema.parse(request.data);
  const name = await getParticipantName(input.headCoachParticipantId);
  const ref = getDb().collection("teams").doc(input.teamId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Team not found");
  const existing = snap.data()!;
  const updated = bumpDocument(existing as never, ctx.uid, {
    headCoachParticipantId: input.headCoachParticipantId,
    headCoachName: name,
  } as never);
  await ref.set(updated, { merge: false });
  return { team: updated };
});

export const addTeamMember = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TEAMS_WRITE);
  const input = addTeamMemberSchema.parse(request.data);

  const teamSnap = await getDb().collection("teams").doc(input.teamId).get();
  if (!teamSnap.exists) throw new HttpsError("not-found", "Team not found");

  const id = getDb().collection("memberships").doc().id;
  const base = baseDocumentFields(
    id,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    "active"
  );
  const participantName = await getParticipantName(input.participantId);

  await getDb()
    .collection("memberships")
    .doc(id)
    .set({
      ...base,
      teamId: input.teamId,
      participantId: input.participantId,
      participantName,
      role: input.role,
    });

  await updateTeamPlayerCount(input.teamId);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "team",
    entityId: input.teamId,
    action: "member_added",
    summary: `${participantName} added to roster`,
    payload: { membershipId: id, role: input.role },
  });

  return { membershipId: id };
});

export const removeTeamMember = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TEAMS_WRITE);
  const input = removeTeamMemberSchema.parse(request.data);

  const ref = getDb().collection("memberships").doc(input.membershipId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Membership not found");
  const existing = snap.data()!;
  const updated = bumpDocument(existing as never, ctx.uid, {
    status: "deleted",
    deletedAt: new Date().toISOString(),
  } as never);
  await ref.set(updated, { merge: false });
  await updateTeamPlayerCount(input.teamId);

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "team",
    entityId: input.teamId,
    action: "member_removed",
    summary: `${existing.participantName} removed from roster`,
  });

  return { membershipId: input.membershipId };
});
