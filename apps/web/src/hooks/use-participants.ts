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
import type { OrganizationDoc, ParticipantDoc } from "@/types/firestore";

export function useParticipants() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["participants", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "participants"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null),
        orderBy("lastName")
      );
      const snap = await getDocs(q);
      return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ParticipantDoc
      );
    },
  });
}

export function useParticipant(id?: string) {
  return useQuery({
    queryKey: ["participant", id],
    enabled: !!id,
    queryFn: async () => {
      const snap = await getDoc(doc(getClientDb(), "participants", id!));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as ParticipantDoc;
    },
  });
}

export function useParticipantMemberships(participantId?: string) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["participant-memberships", participantId],
    enabled: !!participantId,
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "memberships"),
        where("tenantId", "==", tenantId),
        where("participantId", "==", participantId),
        where("deletedAt", "==", null)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as { teamId: string; role: string });
    },
  });
}

export function useOrganizations() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["organizations", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "organizations"),
        where("tenantId", "==", tenantId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as OrganizationDoc
      );
    },
  });
}
