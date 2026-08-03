import type { RoleHeaderContent } from "./role-header-types";

export const COACH_NOTIFICATION_PREVIEW = [
  {
    id: "coach-notif-1",
    title: "Roster update",
    body: "Marcus Allen confirmed for Saturday's game vs Valley Select",
    time: "30m ago",
  },
  {
    id: "coach-notif-2",
    title: "Tournament published",
    body: "Season 1 Pre-Season Tournament bracket and schedule are live",
    time: "3h ago",
  },
  {
    id: "coach-notif-3",
    title: "Facility notice",
    body: "Court 1 reserved for Phoenix Storm practice on Friday at 5:30 PM",
    time: "5h ago",
  },
  {
    id: "coach-notif-4",
    title: "League reminder",
    body: "Championship tournament registration closes in 7 days",
    time: "1d ago",
  },
] as const;

export const COACH_MESSAGE_PREVIEW = [
  {
    id: "coach-msg-1",
    from: "NBBL League Office",
    preview: "Tournament simulation results are ready for your review",
    time: "1h ago",
  },
  {
    id: "coach-msg-2",
    from: "Allen Family",
    preview: "Marcus may arrive 15 minutes late to Saturday's game",
    time: "4h ago",
  },
  {
    id: "coach-msg-3",
    from: "NBBL Admin",
    preview: "Monthly team compliance report is available in Documents",
    time: "1d ago",
  },
] as const;

export const COACH_HEADER_CONTENT: RoleHeaderContent = {
  searchPlaceholder: "Search roster, schedule, team...",
  notificationCount: COACH_NOTIFICATION_PREVIEW.length,
  messageCount: COACH_MESSAGE_PREVIEW.length,
  notifications: COACH_NOTIFICATION_PREVIEW,
  messages: COACH_MESSAGE_PREVIEW,
  notificationsHref: "/coach/notifications",
  messagesHref: "/coach/messages",
};
