"use client";

import { RoleInboxPage } from "@/components/layout/role-inbox-page";
import { PLAYER_NOTIFICATION_PREVIEW } from "@/lib/player-header-content";

export default function PlayerNotificationsPage() {
  return (
    <RoleInboxPage
      title="Notifications"
      description="Practice reminders, game updates, and activity on your profile"
      items={PLAYER_NOTIFICATION_PREVIEW}
      variant="notifications"
    />
  );
}
