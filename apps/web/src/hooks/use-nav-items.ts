"use client";

import { useMemo } from "react";
import {
  resolveMobileTabs,
  resolveNavItems,
  type MobileTabItem,
  type NavItem,
} from "@/config/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function useNavItems(): {
  navItems: readonly NavItem[];
  mobileTabs: readonly MobileTabItem[];
} {
  const user = useAuthStore((s) => s.user);

  return useMemo(
    () => ({
      navItems: resolveNavItems(user?.roleKeys),
      mobileTabs: resolveMobileTabs(user?.roleKeys),
    }),
    [user?.roleKeys]
  );
}
