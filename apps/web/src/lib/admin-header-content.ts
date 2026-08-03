import type { RoleHeaderContent } from "./role-header-types";

export const ADMIN_NOTIFICATION_PREVIEW = [
  {
    id: "admin-notif-1",
    title: "Registration deadline",
    body: "Team registration deadline is tomorrow for the Spring season",
    time: "2h ago",
  },
  {
    id: "admin-notif-2",
    title: "Waiver submitted",
    body: "New participant waiver submitted for review — Marcus Allen, Phoenix Storm",
    time: "5h ago",
  },
  {
    id: "admin-notif-3",
    title: "Schedule change",
    body: "Court 2 maintenance moved U12 league games to Saturday morning",
    time: "1d ago",
  },
  {
    id: "admin-notif-4",
    title: "Payment received",
    body: "Valley Select team registration payment confirmed",
    time: "1d ago",
  },
  {
    id: "admin-notif-5",
    title: "Tournament bracket published",
    body: "Season 1 Pre-Season Tournament bracket is live for review",
    time: "2d ago",
  },
] as const;

export const ADMIN_MESSAGE_PREVIEW = [
  {
    id: "admin-msg-1",
    from: "Coach Williams",
    preview: "Can we reschedule Friday practice to Court 3?",
    time: "1h ago",
  },
  {
    id: "admin-msg-2",
    from: "NBBL Admin",
    preview: "Monthly league compliance report is ready for review",
    time: "4h ago",
  },
  {
    id: "admin-msg-3",
    from: "Facility Manager",
    preview: "Court 2 maintenance complete — available for booking",
    time: "1d ago",
  },
  {
    id: "admin-msg-4",
    from: "Allen Family",
    preview: "Question about sibling discount for Spring registration",
    time: "2d ago",
  },
] as const;

export const ADMIN_HEADER_CONTENT: RoleHeaderContent = {
  searchPlaceholder: "Search participants, teams, events...",
  notificationCount: ADMIN_NOTIFICATION_PREVIEW.length,
  messageCount: ADMIN_MESSAGE_PREVIEW.length,
  notifications: ADMIN_NOTIFICATION_PREVIEW,
  messages: ADMIN_MESSAGE_PREVIEW,
  notificationsHref: "/communications?tab=notifications",
  messagesHref: "/communications?tab=messages",
};
