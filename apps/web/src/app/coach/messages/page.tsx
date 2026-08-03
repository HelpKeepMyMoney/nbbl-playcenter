"use client";

import { RoleInboxPage } from "@/components/layout/role-inbox-page";
import { COACH_MESSAGE_PREVIEW } from "@/lib/coach-header-content";

export default function CoachMessagesPage() {
  return (
    <RoleInboxPage
      title="Messages"
      description="Messages from league admin, parents, and NBBL staff"
      items={COACH_MESSAGE_PREVIEW}
      variant="messages"
    />
  );
}
