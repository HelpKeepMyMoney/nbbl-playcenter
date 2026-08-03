export const FAN_NOTIFICATION_PREVIEW = [
  {
    id: "notif-1",
    title: "Game reminder",
    body: "Phoenix Storm vs Valley Select tomorrow at 9:20 AM",
    time: "2h ago",
  },
  {
    id: "notif-2",
    title: "New highlights",
    body: "Season 1 Pre-Season Tournament highlights are now available",
    time: "5h ago",
  },
  {
    id: "notif-3",
    title: "Standings update",
    body: "Arizona Flight clinched the #1 seed in Girls Division",
    time: "1d ago",
  },
  {
    id: "notif-4",
    title: "Favorite player",
    body: "Marcus Allen scored 12 points in his latest game",
    time: "1d ago",
  },
] as const;

export const FAN_MESSAGE_PREVIEW = [
  {
    id: "msg-1",
    from: "NBBL Merch",
    preview: "New official team jerseys are now available in the shop",
    time: "3h ago",
  },
  {
    id: "msg-2",
    from: "NBBL League Office",
    preview: "Championship tournament registration opens November 1",
    time: "1d ago",
  },
] as const;

export const FAN_NOTIFICATION_COUNT = FAN_NOTIFICATION_PREVIEW.length;
export const FAN_MESSAGE_COUNT = FAN_MESSAGE_PREVIEW.length;
export const FAN_SEARCH_PLACEHOLDER = "Search teams, players, videos, merch...";
