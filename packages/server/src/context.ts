import * as admin from "firebase-admin";
import { hasPermission, type PermissionKey } from "@nbbl/shared";
import { failedPrecondition, permissionDenied } from "./errors";

let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;

export function initAdmin(): void {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp();
    }
  }
  db = admin.firestore();
  auth = admin.auth();
}

export function getDb(): admin.firestore.Firestore {
  if (!db) {
    initAdmin();
  }
  return db!;
}

export function getAdminAuth(): admin.auth.Auth {
  if (!auth) {
    initAdmin();
  }
  return auth!;
}

export interface AuthContext {
  uid: string;
  enterpriseId: string;
  tenantId: string;
  permissionKeys: string[];
  roleKeys: string[];
}

export function getAuthContext(authData: {
  uid: string;
  token: Record<string, unknown>;
}): AuthContext {
  const enterpriseId = authData.token.enterpriseId as string | undefined;
  const tenantId = authData.token.tenantId as string | undefined;
  const permissionKeys = (authData.token.permissionKeys as string[]) ?? [];
  const roleKeys = (authData.token.roleKeys as string[]) ?? [];

  if (!enterpriseId || !tenantId) {
    throw failedPrecondition(
      "User is missing enterprise or tenant claims. Run seed and sign in again."
    );
  }

  return {
    uid: authData.uid,
    enterpriseId,
    tenantId,
    permissionKeys,
    roleKeys,
  };
}

export function requirePermission(
  ctx: AuthContext,
  permission: PermissionKey
): void {
  if (!hasPermission(ctx.permissionKeys, permission)) {
    throw permissionDenied(`Missing permission: ${permission}`);
  }
}

export async function writeAuditLog(params: {
  tenantId: string;
  enterpriseId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const id = getDb().collection("auditLogs").doc().id;
  const now = new Date().toISOString();
  await getDb()
    .collection("auditLogs")
    .doc(id)
    .set({
      id,
      enterpriseId: params.enterpriseId,
      tenantId: params.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: params.actorId,
      updatedBy: params.actorId,
      status: "active",
      version: 1,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      summary: params.summary,
      payload: params.payload ?? {},
    });
}

export async function refreshTeamStats(tenantId: string): Promise<void> {
  const database = getDb();
  const teamsSnap = await database
    .collection("teams")
    .where("tenantId", "==", tenantId)
    .where("deletedAt", "==", null)
    .get();

  let active = 0;
  let season = 0;
  const currentSeason = "season_circuit1_2026";

  teamsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.status === "active") active += 1;
    if (data.seasonId === currentSeason) season += 1;
  });

  const headCoachIds = new Set<string>();
  teamsSnap.docs.forEach((doc) => {
    const hc = doc.data().headCoachParticipantId as string | undefined;
    if (hc) headCoachIds.add(hc);
  });

  const statsRef = database
    .collection("tenants")
    .doc(tenantId)
    .collection("stats")
    .doc("teams");
  const existing = await statsRef.get();
  const previous = existing.exists ? existing.data() : null;

  const totalTeams = teamsSnap.size;
  const totalCoaches = headCoachIds.size;

  await statsRef.set(
    {
      previousTotalTeams: (previous?.totalTeams as number | undefined) ?? 0,
      previousActiveTeams: (previous?.activeTeams as number | undefined) ?? 0,
      previousTeamsThisSeason:
        (previous?.teamsThisSeason as number | undefined) ?? 0,
      previousTotalCoaches:
        (previous?.totalCoaches as number | undefined) ?? 0,
      totalTeams,
      activeTeams: active,
      teamsThisSeason: season,
      totalCoaches,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function refreshMembershipStats(tenantId: string): Promise<void> {
  const database = getDb();
  const membershipsSnap = await database
    .collection("playerMemberships")
    .where("tenantId", "==", tenantId)
    .where("status", "==", "active")
    .where("deletedAt", "==", null)
    .get();

  let totalRevenue = 0;
  membershipsSnap.docs.forEach((doc) => {
    totalRevenue += (doc.data().monthlyAmount as number) ?? 0;
  });

  const statsRef = database
    .collection("tenants")
    .doc(tenantId)
    .collection("stats")
    .doc("dashboard");

  await statsRef.set(
    {
      totalRevenue,
      activeMemberships: membershipsSnap.size,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
