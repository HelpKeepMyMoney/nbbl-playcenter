import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  assignPlayerMembershipSchema,
  baseDocumentFields,
  bumpDocument,
  cancelPlayerMembershipSchema,
  changePlayerMembershipPlanSchema,
  createMembershipPlanSchema,
  pausePlayerMembershipSchema,
  PERMISSIONS,
  resumePlayerMembershipSchema,
  toggleMembershipAutoRenewSchema,
  updateMembershipPlanSchema,
} from "@nbbl/shared";
import {
  getAuthContext,
  getDb,
  refreshMembershipStats,
  requirePermission,
  writeAuditLog,
} from "../lib/context";

async function getMembershipPlan(planId: string, tenantId: string) {
  const snap = await getDb().collection("membershipPlans").doc(planId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Membership plan not found");
  }
  const data = snap.data()!;
  if (data.tenantId !== tenantId) {
    throw new HttpsError("permission-denied", "Tenant mismatch");
  }
  if (data.deletedAt) {
    throw new HttpsError("not-found", "Membership plan not found");
  }
  return { id: snap.id, ...data } as {
    id: string;
    name: string;
    monthlyAmount: number;
    currency?: string;
    status: string;
  };
}

async function getPlayerMembership(membershipId: string, tenantId: string) {
  const ref = getDb().collection("playerMemberships").doc(membershipId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Player membership not found");
  }
  const data = snap.data()!;
  if (data.tenantId !== tenantId) {
    throw new HttpsError("permission-denied", "Tenant mismatch");
  }
  if (data.deletedAt) {
    throw new HttpsError("not-found", "Player membership not found");
  }
  return { ref, data };
}

async function getParticipant(participantId: string, tenantId: string) {
  const snap = await getDb().collection("participants").doc(participantId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Participant not found");
  }
  const data = snap.data()!;
  if (data.tenantId !== tenantId) {
    throw new HttpsError("permission-denied", "Tenant mismatch");
  }
  return { id: snap.id, ...data } as {
    id: string;
    firstName: string;
    lastName: string;
    currentTeamId?: string | null;
  };
}

function addOneMonth(dateStr: string): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export const createMembershipPlan = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const ctx = getAuthContext(request.auth);
  requirePermission(ctx, PERMISSIONS.MEMBERSHIPS_WRITE);

  const input = createMembershipPlanSchema.parse(request.data);
  const id = getDb().collection("membershipPlans").doc().id;
  const base = baseDocumentFields(
    id,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    "active"
  );

  const doc = {
    ...base,
    name: input.name,
    description: input.description ?? null,
    monthlyAmount: input.monthlyAmount,
    currency: input.currency ?? "USD",
    billingInterval: "monthly" as const,
    status: "active" as const,
  };

  await getDb().collection("membershipPlans").doc(id).set(doc);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "membershipPlan",
    entityId: id,
    action: "created",
    summary: `Membership plan created: ${input.name}`,
    payload: { monthlyAmount: input.monthlyAmount },
  });

  return { id, plan: doc };
});

export const updateMembershipPlan = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const ctx = getAuthContext(request.auth);
  requirePermission(ctx, PERMISSIONS.MEMBERSHIPS_WRITE);

  const input = updateMembershipPlanSchema.parse(request.data);
  const ref = getDb().collection("membershipPlans").doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Membership plan not found");
  }
  const existing = snap.data()!;
  if (existing.tenantId !== ctx.tenantId) {
    throw new HttpsError("permission-denied", "Tenant mismatch");
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.monthlyAmount !== undefined) patch.monthlyAmount = input.monthlyAmount;
  if (input.status !== undefined) patch.status = input.status;

  const updated = bumpDocument(existing as never, ctx.uid, patch as never);
  await ref.set(updated, { merge: false });
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "membershipPlan",
    entityId: input.id,
    action: "updated",
    summary: `Membership plan updated: ${input.name ?? existing.name}`,
    payload: patch,
  });

  return { id: input.id };
});

export const assignPlayerMembership = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const ctx = getAuthContext(request.auth);
  requirePermission(ctx, PERMISSIONS.MEMBERSHIPS_WRITE);

  const input = assignPlayerMembershipSchema.parse(request.data);
  const participant = await getParticipant(input.participantId, ctx.tenantId);
  const plan = await getMembershipPlan(input.planId, ctx.tenantId);

  if (plan.status !== "active") {
    throw new HttpsError("failed-precondition", "Plan is not active");
  }

  const existingSnap = await getDb()
    .collection("playerMemberships")
    .where("tenantId", "==", ctx.tenantId)
    .where("participantId", "==", input.participantId)
    .where("deletedAt", "==", null)
    .get();

  const activeExisting = existingSnap.docs.find(
    (d) => ["active", "paused", "pending"].includes(d.data().status as string)
  );
  if (activeExisting) {
    throw new HttpsError(
      "already-exists",
      "Participant already has an active membership"
    );
  }

  const effectiveDate = input.effectiveDate ?? new Date().toISOString().slice(0, 10);
  const nextBillingDate = addOneMonth(effectiveDate);
  const id = getDb().collection("playerMemberships").doc().id;
  const base = baseDocumentFields(
    id,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    "active"
  );

  const teamId = (participant.currentTeamId as string | null) ?? null;
  let teamName: string | null = null;
  if (teamId) {
    const teamSnap = await getDb().collection("teams").doc(teamId).get();
    if (teamSnap.exists) {
      teamName = (teamSnap.data()?.name as string) ?? null;
    }
  }

  const doc = {
    ...base,
    participantId: input.participantId,
    participantName: `${participant.firstName} ${participant.lastName}`,
    teamId,
    teamName,
    planId: plan.id,
    planName: plan.name,
    monthlyAmount: plan.monthlyAmount,
    currency: plan.currency ?? "USD",
    status: "active" as const,
    effectiveDate,
    nextBillingDate,
    autoRenew: true,
    pausedAt: null,
    cancelledAt: null,
    cancelReason: null,
  };

  await getDb().collection("playerMemberships").doc(id).set(doc);
  await refreshMembershipStats(ctx.tenantId);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "playerMembership",
    entityId: id,
    action: "assigned",
    summary: `Membership assigned to ${doc.participantName}`,
    payload: { planId: plan.id, planName: plan.name },
  });

  return { id, membership: doc };
});

export const changePlayerMembershipPlan = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const ctx = getAuthContext(request.auth);
  requirePermission(ctx, PERMISSIONS.MEMBERSHIPS_WRITE);

  const input = changePlayerMembershipPlanSchema.parse(request.data);
  const { ref, data: existing } = await getPlayerMembership(
    input.membershipId,
    ctx.tenantId
  );
  const plan = await getMembershipPlan(input.planId, ctx.tenantId);

  if (!["active", "paused"].includes(existing.status as string)) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot change plan on cancelled or expired membership"
    );
  }

  const updated = bumpDocument(existing as never, ctx.uid, {
    planId: plan.id,
    planName: plan.name,
    monthlyAmount: plan.monthlyAmount,
    currency: plan.currency ?? "USD",
  } as never);
  await ref.set(updated, { merge: false });
  await refreshMembershipStats(ctx.tenantId);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "playerMembership",
    entityId: input.membershipId,
    action: "plan_changed",
    summary: `Membership plan changed to ${plan.name} for ${existing.participantName}`,
    payload: { planId: plan.id },
  });

  return { id: input.membershipId };
});

export const pausePlayerMembership = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const ctx = getAuthContext(request.auth);
  requirePermission(ctx, PERMISSIONS.MEMBERSHIPS_WRITE);

  const input = pausePlayerMembershipSchema.parse(request.data);
  const { ref, data: existing } = await getPlayerMembership(
    input.membershipId,
    ctx.tenantId
  );

  if (existing.status !== "active") {
    throw new HttpsError("failed-precondition", "Only active memberships can be paused");
  }

  const now = new Date().toISOString();
  const updated = bumpDocument(existing as never, ctx.uid, {
    status: "paused",
    pausedAt: now,
  } as never);
  await ref.set(updated, { merge: false });
  await refreshMembershipStats(ctx.tenantId);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "playerMembership",
    entityId: input.membershipId,
    action: "paused",
    summary: `Membership paused for ${existing.participantName}`,
  });

  return { id: input.membershipId };
});

export const resumePlayerMembership = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const ctx = getAuthContext(request.auth);
  requirePermission(ctx, PERMISSIONS.MEMBERSHIPS_WRITE);

  const input = resumePlayerMembershipSchema.parse(request.data);
  const { ref, data: existing } = await getPlayerMembership(
    input.membershipId,
    ctx.tenantId
  );

  if (existing.status !== "paused") {
    throw new HttpsError("failed-precondition", "Only paused memberships can be resumed");
  }

  const updated = bumpDocument(existing as never, ctx.uid, {
    status: "active",
    pausedAt: null,
  } as never);
  await ref.set(updated, { merge: false });
  await refreshMembershipStats(ctx.tenantId);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "playerMembership",
    entityId: input.membershipId,
    action: "resumed",
    summary: `Membership resumed for ${existing.participantName}`,
  });

  return { id: input.membershipId };
});

export const cancelPlayerMembership = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const ctx = getAuthContext(request.auth);
  requirePermission(ctx, PERMISSIONS.MEMBERSHIPS_WRITE);

  const input = cancelPlayerMembershipSchema.parse(request.data);
  const { ref, data: existing } = await getPlayerMembership(
    input.membershipId,
    ctx.tenantId
  );

  if (existing.status === "cancelled") {
    throw new HttpsError("failed-precondition", "Membership is already cancelled");
  }

  const now = new Date().toISOString();
  const updated = bumpDocument(existing as never, ctx.uid, {
    status: "cancelled",
    cancelledAt: now,
    cancelReason: input.cancelReason ?? null,
    autoRenew: false,
  } as never);
  await ref.set(updated, { merge: false });
  await refreshMembershipStats(ctx.tenantId);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "playerMembership",
    entityId: input.membershipId,
    action: "cancelled",
    summary: `Membership cancelled for ${existing.participantName}`,
    payload: { cancelReason: input.cancelReason },
  });

  return { id: input.membershipId };
});

export const toggleMembershipAutoRenew = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const ctx = getAuthContext(request.auth);
  requirePermission(ctx, PERMISSIONS.MEMBERSHIPS_WRITE);

  const input = toggleMembershipAutoRenewSchema.parse(request.data);
  const { ref, data: existing } = await getPlayerMembership(
    input.membershipId,
    ctx.tenantId
  );

  if (existing.status === "cancelled") {
    throw new HttpsError(
      "failed-precondition",
      "Cannot toggle auto-renew on cancelled membership"
    );
  }

  const updated = bumpDocument(existing as never, ctx.uid, {
    autoRenew: input.autoRenew,
  } as never);
  await ref.set(updated, { merge: false });
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "playerMembership",
    entityId: input.membershipId,
    action: "auto_renew_toggled",
    summary: `Auto-renew ${input.autoRenew ? "enabled" : "disabled"} for ${existing.participantName}`,
    payload: { autoRenew: input.autoRenew },
  });

  return { id: input.membershipId, autoRenew: input.autoRenew };
});
