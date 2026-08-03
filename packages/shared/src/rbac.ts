export const PERMISSIONS = {
  PARTICIPANTS_READ: "participants:read",
  PARTICIPANTS_WRITE: "participants:write",
  TEAMS_READ: "teams:read",
  TEAMS_WRITE: "teams:write",
  TOURNAMENTS_READ: "tournaments:read",
  TOURNAMENTS_WRITE: "tournaments:write",
  MEMBERSHIPS_READ: "memberships:read",
  MEMBERSHIPS_WRITE: "memberships:write",
  ADMIN: "admin:all",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_KEYS = {
  LEAGUE_ADMIN: "league_admin",
  COACH: "coach",
  READ_ONLY: "read_only",
  PLAYER: "player",
  FAN: "fan",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  league_admin: [
    PERMISSIONS.PARTICIPANTS_READ,
    PERMISSIONS.PARTICIPANTS_WRITE,
    PERMISSIONS.TEAMS_READ,
    PERMISSIONS.TEAMS_WRITE,
    PERMISSIONS.TOURNAMENTS_READ,
    PERMISSIONS.TOURNAMENTS_WRITE,
    PERMISSIONS.MEMBERSHIPS_READ,
    PERMISSIONS.MEMBERSHIPS_WRITE,
    PERMISSIONS.ADMIN,
  ],
  coach: [
    PERMISSIONS.PARTICIPANTS_READ,
    PERMISSIONS.TEAMS_READ,
    PERMISSIONS.TEAMS_WRITE,
    PERMISSIONS.MEMBERSHIPS_READ,
    PERMISSIONS.TOURNAMENTS_READ,
  ],
  read_only: [
    PERMISSIONS.PARTICIPANTS_READ,
    PERMISSIONS.TEAMS_READ,
    PERMISSIONS.MEMBERSHIPS_READ,
  ],
  player: [
    PERMISSIONS.PARTICIPANTS_READ,
    PERMISSIONS.TEAMS_READ,
    PERMISSIONS.MEMBERSHIPS_READ,
    PERMISSIONS.TOURNAMENTS_READ,
  ],
  fan: [
    PERMISSIONS.TOURNAMENTS_READ,
    PERMISSIONS.TEAMS_READ,
    PERMISSIONS.PARTICIPANTS_READ,
  ],
};

export function hasPermission(
  permissionKeys: string[] | undefined,
  required: PermissionKey
): boolean {
  if (!permissionKeys?.length) return false;
  if (permissionKeys.includes(PERMISSIONS.ADMIN)) return true;
  return permissionKeys.includes(required);
}
