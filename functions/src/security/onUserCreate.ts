import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {
  DEFAULT_TENANT_ID,
  ENTERPRISE_ID,
  ROLE_KEYS,
  ROLE_PERMISSIONS,
} from "@nbbl/shared";
import { getDb } from "../lib/context";

/** Provisions Firestore user profile and claims for Auth emulator sign-ups. */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = getDb();
  const existing = await db.collection("users").doc(user.uid).get();
  if (existing.exists) {
    return;
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

  await admin.auth().setCustomUserClaims(user.uid, {
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    roleKeys,
    permissionKeys,
  });
});
