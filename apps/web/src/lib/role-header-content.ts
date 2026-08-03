import type { AppUser } from "@/stores/auth-store";
import { isCoach, isFan, isPlayer } from "@/lib/user-role";
import { COACH_HEADER_CONTENT } from "@/lib/coach-header-content";
import { FAN_MESSAGE_PREVIEW, FAN_NOTIFICATION_PREVIEW } from "@/lib/fan-header-content";
import { PLAYER_HEADER_CONTENT } from "@/lib/player-header-content";
import type { RoleHeaderContent } from "@/lib/role-header-types";

const ADMIN_NOTIFICATION_PREVIEW = [
  {
    id: "admin-notif-1",
    title: "Registration deadline",
    body: "Team registration deadline is tomorrow",
    time: "2h ago",
  },
  {
    id: "admin-notif-2",
    title: "Waiver submitted",
    body: "New participant waiver submitted for review",
    time: "5h ago",
  },
  {
    id: "admin-notif-3",
    title: "Schedule change",
    body: "Schedule change for U12 league",
    time: "1d ago",
  },
] as const;

const ADMIN_MESSAGE_PREVIEW = [
  {
    id: "admin-msg-1",
    from: "Coach Williams",
    preview: "Can we reschedule practice?",
    time: "1h ago",
  },
  {
    id: "admin-msg-2",
    from: "Admin",
    preview: "Monthly report is ready",
    time: "4h ago",
  },
  {
    id: "admin-msg-3",
    from: "Facility",
    preview: "Court 2 maintenance complete",
    time: "1d ago",
  },
] as const;

const ADMIN_HEADER_CONTENT: RoleHeaderContent = {
  searchPlaceholder: "Search participants, teams, events...",
  notificationCount: 8,
  messageCount: 3,
  notifications: ADMIN_NOTIFICATION_PREVIEW,
  messages: ADMIN_MESSAGE_PREVIEW,
  notificationsHref: "/communications",
  messagesHref: "/communications",
};

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
