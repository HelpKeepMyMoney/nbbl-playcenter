"use client";

import { useQuery } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { DEFAULT_TENANT_ID } from "@nbbl/shared";
import { getClientDb } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";
import type {
  MembershipDoc,
  TeamDoc,
  TeamStatsDoc,
} from "@/types/firestore";

export function useTeams() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["teams", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "teams"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null),
        orderBy("name")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamDoc);
    },
  });
}

export function useTeam(teamId?: string) {
  return useQuery({
    queryKey: ["team", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const snap = await getDoc(doc(getClientDb(), "teams", teamId!));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as TeamDoc;
    },
  });
}

export function useTeamStats() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["team-stats", tenantId],
    queryFn: async () => {
      const snap = await getDoc(
        doc(getClientDb(), "tenants", tenantId, "stats", "teams")
      );
      if (!snap.exists()) {
        return {
          totalTeams: 0,
          activeTeams: 0,
          teamsThisSeason: 0,
          totalCoaches: 0,
          previousTotalTeams: 0,
          previousActiveTeams: 0,
          previousTeamsThisSeason: 0,
          previousTotalCoaches: 0,
        } satisfies TeamStatsDoc;
      }
      return snap.data() as TeamStatsDoc;
    },
  });
}

export function useAllMemberships() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["memberships", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "memberships"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null)
      );
      const snap = await getDocs(q);
      return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as MembershipDoc
      );
    },
  });
}

export function useTeamMemberships(teamId?: string) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["memberships", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "memberships"),
        where("tenantId", "==", tenantId),
        where("teamId", "==", teamId),
        where("deletedAt", "==", null)
      );
      const snap = await getDocs(q);
      return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as MembershipDoc
      );
    },
  });
}

export function useTeamActivity(teamId?: string) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["team-activity", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "auditLogs"),
        where("tenantId", "==", tenantId),
        where("entityType", "==", "team"),
        where("entityId", "==", teamId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    },
  });
}
