import type { PlayerMembershipDoc } from "@/types/firestore";

export function membershipStatusBadge(status: PlayerMembershipDoc["status"]) {
  switch (status) {
    case "active":
      return "success" as const;
    case "paused":
      return "warning" as const;
    case "cancelled":
    case "expired":
      return "muted" as const;
    default:
      return "muted" as const;
  }
}

export function formatMembershipStatus(status: PlayerMembershipDoc["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
