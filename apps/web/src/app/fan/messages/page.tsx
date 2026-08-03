"use client";

import { RoleInboxPage } from "@/components/layout/role-inbox-page";
import { FAN_MESSAGE_PREVIEW } from "@/lib/fan-header-content";

export default function FanMessagesPage() {
  return (
    <RoleInboxPage
      title="Messages"
      description="League announcements, merch updates, and fan community news"
      items={FAN_MESSAGE_PREVIEW}
      variant="messages"
    />
  );
}
