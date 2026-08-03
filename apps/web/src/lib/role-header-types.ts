export type NotificationPreviewItem = {
  id: string;
  title: string;
  body: string;
  time: string;
};

export type MessagePreviewItem = {
  id: string;
  from: string;
  preview: string;
  time: string;
};

export type RoleHeaderContent = {
  searchPlaceholder: string;
  notificationCount: number;
  messageCount: number;
  notifications: readonly NotificationPreviewItem[];
  messages: readonly MessagePreviewItem[];
  notificationsHref: string;
  messagesHref: string;
};
