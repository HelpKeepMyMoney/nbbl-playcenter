"use client";

import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { DEFAULT_TENANT_ID } from "@nbbl/shared";
import { getClientDb } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";
import type {
  MembershipPlanDoc,
  PlayerMembershipDoc,
} from "@/types/firestore";

export function useMembershipPlans() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["membershipPlans", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "membershipPlans"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null),
        orderBy("name")
      );
      const snap = await getDocs(q);
      return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as MembershipPlanDoc
      );
    },
  });
}

export function usePlayerMemberships() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["playerMemberships", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "playerMemberships"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null),
        orderBy("participantName")
      );
      const snap = await getDocs(q);
      return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as PlayerMembershipDoc
      );
    },
  });
}

export function useParticipantPlayerMembership(participantId?: string) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["participant-membership", tenantId, participantId],
    enabled: !!participantId,
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "playerMemberships"),
        where("tenantId", "==", tenantId),
        where("participantId", "==", participantId!),
        where("deletedAt", "==", null)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docs = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as PlayerMembershipDoc
      );
      const priority = ["active", "paused", "pending", "expired", "cancelled"];
      docs.sort(
        (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status)
      );
      return docs[0] ?? null;
    },
  });
}
