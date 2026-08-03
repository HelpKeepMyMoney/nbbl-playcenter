"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { DEFAULT_TENANT_ID } from "@nbbl/shared";
import { getClientDb } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";
import type { DashboardStatsDoc } from "@/types/firestore";

export function useDashboardStats() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["dashboard-stats", tenantId],
    queryFn: async () => {
      const snap = await getDoc(
        doc(getClientDb(), "tenants", tenantId, "stats", "dashboard")
      );
      if (!snap.exists()) return null;
      return snap.data() as DashboardStatsDoc;
    },
  });
}
