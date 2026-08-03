"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { hasPermission, PERMISSIONS, type PermissionKey } from "@nbbl/shared";
import { getClientDb } from "@/lib/firebase";
import { isRecoverableAuthSessionError } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";

async function loadPermissionKeys(
  uid: string,
  forceRefresh: boolean
): Promise<string[]> {
  const firebaseUser = useAuthStore.getState().firebaseUser;
  const keys = new Set<string>();

  if (firebaseUser) {
    const token = await firebaseUser.getIdTokenResult(forceRefresh);
    const claimKeys = token.claims.permissionKeys;
    if (Array.isArray(claimKeys)) {
      claimKeys.forEach((k) => keys.add(String(k)));
    }
  }

  const profileSnap = await getDoc(doc(getClientDb(), "users", uid));
  const profileKeys = profileSnap.data()?.permissionKeys;
  if (Array.isArray(profileKeys)) {
    profileKeys.forEach((k) => keys.add(String(k)));
  }

  const roleKeys = profileSnap.data()?.roleKeys;
  if (Array.isArray(roleKeys) && roleKeys.includes("league_admin")) {
    keys.add(PERMISSIONS.ADMIN);
    keys.add(PERMISSIONS.TOURNAMENTS_WRITE);
    keys.add(PERMISSIONS.TOURNAMENTS_READ);
    keys.add(PERMISSIONS.MEMBERSHIPS_WRITE);
    keys.add(PERMISSIONS.MEMBERSHIPS_READ);
  }

  return [...keys];
}

export function usePermissions() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setPermissionKeys([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadPermissionKeys(firebaseUser.uid, false)
      .then((keys) => {
        if (!cancelled) setPermissionKeys(keys);
      })
      .catch(async (error) => {
        if (isRecoverableAuthSessionError(error)) {
          await useAuthStore.getState().signOut();
          if (!cancelled) setPermissionKeys([]);
          return;
        }
        throw error;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  function can(permission: PermissionKey): boolean {
    return hasPermission(permissionKeys, permission);
  }

  return { permissionKeys, loading, can };
}

export function useCanWriteTournaments() {
  const { can, loading } = usePermissions();
  if (loading) return false;
  return can(PERMISSIONS.TOURNAMENTS_WRITE);
}
