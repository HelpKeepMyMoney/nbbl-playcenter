import type { RoleHeaderContent } from "./role-header-types";

export const PLAYER_NOTIFICATION_PREVIEW = [
  {
    id: "player-notif-1",
    title: "Practice reminder",
    body: "Phoenix Storm practice tomorrow at 5:30 PM at NBBL Academy",
    time: "1h ago",
  },
  {
    id: "player-notif-2",
    title: "Game scheduled",
    body: "You are on the roster for Phoenix Storm vs Valley Select on Saturday",
    time: "4h ago",
  },
  {
    id: "player-notif-3",
    title: "Stats updated",
    body: "Your box score from the Pre-Season Tournament is now on your profile",
    time: "1d ago",
  },
] as const;

export const PLAYER_MESSAGE_PREVIEW = [
  {
    id: "player-msg-1",
    from: "Coach Anthony Ray",
    preview: "Great effort at practice today — keep working on off-ball movement",
    time: "2h ago",
  },
  {
    id: "player-msg-2",
    from: "Phoenix Storm Team Manager",
    preview: "Reminder to upload your signed waiver before Saturday's game",
    time: "6h ago",
  },
  {
    id: "player-msg-3",
    from: "NBBL Membership",
    preview: "Your Circuit 1 membership renews on September 1",
    time: "2d ago",
  },
] as const;

export const PLAYER_HEADER_CONTENT: RoleHeaderContent = {
  searchPlaceholder: "Search schedule, team, documents...",
  notificationCount: PLAYER_NOTIFICATION_PREVIEW.length,
  messageCount: PLAYER_MESSAGE_PREVIEW.length,
  notifications: PLAYER_NOTIFICATION_PREVIEW,
  messages: PLAYER_MESSAGE_PREVIEW,
  notificationsHref: "/player/notifications",
  messagesHref: "/player/messages",
};
