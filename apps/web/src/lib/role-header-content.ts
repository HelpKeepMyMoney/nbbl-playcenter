import type { AppUser } from "@/stores/auth-store";
import { isCoach, isFan, isPlayer } from "@/lib/user-role";
import { ADMIN_HEADER_CONTENT } from "@/lib/admin-header-content";
import { COACH_HEADER_CONTENT } from "@/lib/coach-header-content";
import { FAN_MESSAGE_PREVIEW, FAN_NOTIFICATION_PREVIEW } from "@/lib/fan-header-content";
import { PLAYER_HEADER_CONTENT } from "@/lib/player-header-content";
import type { RoleHeaderContent } from "@/lib/role-header-types";

const FAN_HEADER_CONTENT: RoleHeaderContent = {
  searchPlaceholder: "Search teams, players, videos, merch...",
  notificationCount: FAN_NOTIFICATION_PREVIEW.length,
  messageCount: FAN_MESSAGE_PREVIEW.length,
  notifications: FAN_NOTIFICATION_PREVIEW,
  messages: FAN_MESSAGE_PREVIEW,
  notificationsHref: "/fan/notifications",
  messagesHref: "/fan/messages",
};

export function getRoleHeaderContent(
  user: AppUser | null | undefined
): RoleHeaderContent {
  if (isPlayer(user)) return PLAYER_HEADER_CONTENT;
  if (isCoach(user)) return COACH_HEADER_CONTENT;
  if (isFan(user)) return FAN_HEADER_CONTENT;
  return ADMIN_HEADER_CONTENT;
}
