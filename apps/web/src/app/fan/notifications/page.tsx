"use client";

import { RoleInboxPage } from "@/components/layout/role-inbox-page";
import { FAN_NOTIFICATION_PREVIEW } from "@/lib/fan-header-content";

export default function FanNotificationsPage() {
  return (
    <RoleInboxPage
      title="Notifications"
      description="Game reminders, highlights, and updates from your favorite teams and players"
      items={FAN_NOTIFICATION_PREVIEW}
      variant="notifications"
    />
  );
}
