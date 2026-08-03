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
  CommunicationDoc,
  EventDoc,
  FacilityDoc,
  BinodeDoc,
} from "@/types/firestore";

export function useFacilities() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["facilities", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "facilities"),
        where("tenantId", "==", tenantId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as FacilityDoc
      );
    },
  });
}

export function useBinodes() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["binodes", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "binodes"),
        where("tenantId", "==", tenantId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BinodeDoc);
    },
  });
}

export function useUpcomingEvents(limit = 8) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["upcoming-events", tenantId, limit],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "events"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null),
        orderBy("startAt")
      );
      const snap = await getDocs(q);
      const now = Date.now();
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as EventDoc)
        .filter((e) => new Date(e.startAt).getTime() >= now)
        .slice(0, limit);
    },
  });
}

export function useCommunications(limit = 5) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["communications", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "communications"),
        where("tenantId", "==", tenantId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs
        .slice(0, limit)
        .map((d) => ({ id: d.id, ...d.data() }) as CommunicationDoc);
    },
  });
}

export function useTeamEvents(teamId?: string) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["team-events", tenantId, teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "events"),
        where("tenantId", "==", tenantId),
        where("teamId", "==", teamId!),
        where("deletedAt", "==", null),
        orderBy("startAt")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventDoc);
    },
  });
}
