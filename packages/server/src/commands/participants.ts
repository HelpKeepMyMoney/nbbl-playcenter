import {
  baseDocumentFields,
  bumpDocument,
  type BaseDocument,
  createParticipantSchema,
  PERMISSIONS,
  softDeleteParticipantSchema,
  updateParticipantSchema,
} from "@nbbl/shared";
import {
  type AuthContext,
  getDb,
  requirePermission,
  writeAuditLog,
} from "../context";
import { notFound, permissionDenied } from "../errors";

export async function handleCreateParticipant(ctx: AuthContext, data: unknown) {
  requirePermission(ctx, PERMISSIONS.PARTICIPANTS_WRITE);
  const input = createParticipantSchema.parse(data);
  const id = getDb().collection("participants").doc().id;
  const base = baseDocumentFields(
    id,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    "active"
  );

  const doc = {
    ...base,
    type: input.type,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email || null,
    phone: input.phone || null,
    dateOfBirth: input.dateOfBirth || null,
    organizationId: input.organizationId,
    avatarUrl: input.avatarUrl || null,
    tags: input.tags ?? [],
  };

  await getDb().collection("participants").doc(id).set(doc);
  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "participant",
    entityId: id,
    action: "created",
    summary: `Participant created: ${input.firstName} ${input.lastName}`,
    payload: { type: input.type },
  });

  return { id, participant: doc };
}

export async function handleUpdateParticipant(ctx: AuthContext, data: unknown) {
  requirePermission(ctx, PERMISSIONS.PARTICIPANTS_WRITE);
  const input = updateParticipantSchema.parse(data);
  const ref = getDb().collection("participants").doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw notFound("Participant not found");
  }
  const existing = snap.data()!;
  if (existing.tenantId !== ctx.tenantId) {
    throw permissionDenied("Tenant mismatch");
  }

  const { id: _id, ...patch } = input;
  const updated = bumpDocument(
    { ...existing } as BaseDocument & Record<string, unknown>,
    ctx.uid,
    patch as Record<string, unknown>
  );
  await ref.set(updated, { merge: false });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "participant",
    entityId: input.id,
    action: "updated",
    summary: `Participant updated: ${String(updated.firstName)} ${String(updated.lastName)}`,
  });

  return { participant: updated };
}

export async function handleSoftDeleteParticipant(
  ctx: AuthContext,
  data: unknown
) {
  requirePermission(ctx, PERMISSIONS.PARTICIPANTS_WRITE);
  const input = softDeleteParticipantSchema.parse(data);
  const ref = getDb().collection("participants").doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw notFound("Participant not found");
  }
  const existing = snap.data()!;
  if (existing.tenantId !== ctx.tenantId) {
    throw permissionDenied("Tenant mismatch");
  }

  const updated = bumpDocument(existing as never, ctx.uid, {
    status: "deleted",
    deletedAt: new Date().toISOString(),
  } as Record<string, unknown> as never);
  await ref.set(updated, { merge: false });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "participant",
    entityId: input.id,
    action: "deleted",
    summary: `Participant soft-deleted: ${existing.firstName} ${existing.lastName}`,
  });

  return { id: input.id };
}
