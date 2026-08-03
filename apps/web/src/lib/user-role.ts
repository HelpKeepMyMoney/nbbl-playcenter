import type { AppUser } from "@/stores/auth-store";

export function isPlayer(user: AppUser | null | undefined): boolean {
  return user?.roleKeys?.includes("player") ?? false;
}

export function isCoach(user: AppUser | null | undefined): boolean {
  return user?.roleKeys?.includes("coach") ?? false;
}

export function isFan(user: AppUser | null | undefined): boolean {
  return user?.roleKeys?.includes("fan") ?? false;
}

export function isLeagueAdmin(user: AppUser | null | undefined): boolean {
  return user?.roleKeys?.includes("league_admin") ?? false;
}

export function getRoleBasePath(user: AppUser | null | undefined): string {
  if (isPlayer(user)) return "/player";
  if (isCoach(user)) return "/coach";
  if (isFan(user)) return "/fan";
  return "";
}

export function getPostLoginPath(user: AppUser | null | undefined): string {
  const base = getRoleBasePath(user);
  return base ? `${base}/dashboard` : "/dashboard";
}
