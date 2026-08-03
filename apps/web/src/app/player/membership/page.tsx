"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerMembershipTab } from "@/components/participants/player-membership-tab";
import { useParticipant } from "@/hooks/use-participants";
import { useParticipantPlayerMembership } from "@/hooks/use-player-memberships";
import { useAuthStore } from "@/stores/auth-store";

export default function PlayerMembershipPage() {
  const user = useAuthStore((s) => s.user);
  const participantId = user?.participantId;
  const { data: participant, isLoading, error } = useParticipant(participantId);
  const { data: playerMembership } = useParticipantPlayerMembership(
    participantId
  );

  if (!participantId) {
    return (
      <AppShell title="Membership">
        <div className="p-4 lg:p-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">
              No membership profile is linked to your account.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Membership">
      {isLoading ? (
        <div className="p-6 text-sm text-gray-500">Loading membership...</div>
      ) : error || !participant ? (
        <div className="p-4 lg:p-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">
              Profile not found.{" "}
              <Link
                href="/player/dashboard"
                className="text-nbbl-red hover:underline"
              >
                Return to dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-4 lg:p-6">
          <PlayerMembershipTab
            participant={participant}
            membership={playerMembership}
          />
        </div>
      )}
    </AppShell>
  );
}
