import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSIONS, ROLE_PERMISSIONS } from "./rbac";

describe("hasPermission", () => {
  it("grants admin all permissions", () => {
    expect(hasPermission([PERMISSIONS.ADMIN], PERMISSIONS.TEAMS_WRITE)).toBe(
      true
    );
  });

  it("respects role permission lists", () => {
    expect(
      hasPermission(ROLE_PERMISSIONS.read_only, PERMISSIONS.PARTICIPANTS_READ)
    ).toBe(true);
    expect(
      hasPermission(ROLE_PERMISSIONS.read_only, PERMISSIONS.TEAMS_WRITE)
    ).toBe(false);
  });

  it("grants player read permissions without write", () => {
    expect(
      hasPermission(ROLE_PERMISSIONS.player, PERMISSIONS.TOURNAMENTS_READ)
    ).toBe(true);
    expect(
      hasPermission(ROLE_PERMISSIONS.player, PERMISSIONS.PARTICIPANTS_WRITE)
    ).toBe(false);
  });
});
