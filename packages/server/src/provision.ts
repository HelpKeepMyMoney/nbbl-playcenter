import {
  DEFAULT_TENANT_ID,
  ENTERPRISE_ID,
  ROLE_KEYS,
  ROLE_PERMISSIONS,
} from "@nbbl/shared";
import { getAdminAuth, getDb } from "./context";

export async function provisionUser(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<{ provisioned: boolean }> {
  const db = getDb();
  const existing = await db.collection("users").doc(user.uid).get();
  if (existing.exists) {
    return { provisioned: false };
  }

  const roleKeys = [ROLE_KEYS.READ_ONLY];
  const permissionKeys = ROLE_PERMISSIONS.read_only;

  await db.collection("users").doc(user.uid).set({
    id: user.uid,
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    email: user.email ?? null,
    displayName: user.displayName ?? user.email ?? "User",
    roleKeys,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    version: 1,
  });

  await getAdminAuth().setCustomUserClaims(user.uid, {
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    roleKeys,
    permissionKeys,
  });

  return { provisioned: true };
}
