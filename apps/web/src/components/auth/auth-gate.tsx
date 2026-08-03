"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLeagueAdminRoute } from "@/config/navigation";
import { isCoach, isFan, isPlayer } from "@/lib/user-role";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => init(), [init]);

  useEffect(() => {
    if (!initialized) return;
    if (!firebaseUser && pathname !== "/login") {
      router.replace("/login");
    }
  }, [initialized, firebaseUser, pathname, router]);

  useEffect(() => {
    if (!initialized || !firebaseUser || !user) return;

    if (isPlayer(user) && isLeagueAdminRoute(pathname)) {
      router.replace("/player/dashboard");
      return;
    }

    if (isCoach(user) && isLeagueAdminRoute(pathname)) {
      router.replace("/coach/dashboard");
      return;
    }

    if (isFan(user) && isLeagueAdminRoute(pathname)) {
      router.replace("/fan/dashboard");
      return;
    }

    if (isPlayer(user) && (pathname.startsWith("/coach") || pathname.startsWith("/fan"))) {
      router.replace("/player/dashboard");
      return;
    }

    if (isCoach(user) && (pathname.startsWith("/player") || pathname.startsWith("/fan"))) {
      router.replace("/coach/dashboard");
      return;
    }

    if (isFan(user) && (pathname.startsWith("/player") || pathname.startsWith("/coach"))) {
      router.replace("/fan/dashboard");
    }
  }, [initialized, firebaseUser, user, pathname, router]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nbbl-surface">
        <p className="text-sm text-gray-500">Loading PlayCenter...</p>
      </div>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}
