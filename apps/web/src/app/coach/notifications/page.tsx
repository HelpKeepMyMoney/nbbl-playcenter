"use client";

import { RoleInboxPage } from "@/components/layout/role-inbox-page";
import { COACH_NOTIFICATION_PREVIEW } from "@/lib/coach-header-content";

export default function CoachNotificationsPage() {
  return (
    <RoleInboxPage
      title="Notifications"
      description="Roster updates, tournament notices, and facility alerts for your team"
      items={COACH_NOTIFICATION_PREVIEW}
      variant="notifications"
    />
  );
}
