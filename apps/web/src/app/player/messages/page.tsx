"use client";

import { RoleInboxPage } from "@/components/layout/role-inbox-page";
import { PLAYER_MESSAGE_PREVIEW } from "@/lib/player-header-content";

export default function PlayerMessagesPage() {
  return (
    <RoleInboxPage
      title="Messages"
      description="Messages from your coach, team staff, and league office"
      items={PLAYER_MESSAGE_PREVIEW}
      variant="messages"
    />
  );
}
