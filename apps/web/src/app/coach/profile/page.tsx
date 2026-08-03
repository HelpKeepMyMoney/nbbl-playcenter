"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerProfileView } from "@/components/participants/player-profile-view";
import {
  useOrganizations,
  useParticipant,
  useParticipantMemberships,
} from "@/hooks/use-participants";
import { useTeams } from "@/hooks/use-teams";
import { useAuthStore } from "@/stores/auth-store";

export default function CoachProfilePage() {
  const user = useAuthStore((s) => s.user);
  const participantId = user?.participantId;
  const { data: participant, isLoading, error } = useParticipant(participantId);
  const { data: organizations = [] } = useOrganizations();
  const { data: memberships = [] } = useParticipantMemberships(participantId);
  const { data: teams = [] } = useTeams();

  const fullName = participant
    ? `${participant.firstName} ${participant.lastName}`
    : "My Profile";

  if (!participantId) {
    return (
      <AppShell title="My Profile">
        <div className="p-4 lg:p-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">
              No coach profile is linked to your account.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={fullName}>
      {isLoading ? (
        <div className="p-6 text-sm text-gray-500">Loading profile...</div>
      ) : error || !participant ? (
        <div className="p-4 lg:p-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">
              Profile not found.{" "}
              <Link
                href="/coach/dashboard"
                className="text-nbbl-red hover:underline"
              >
                Return to dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : (
        <PlayerProfileView
          participant={participant}
          organizations={organizations}
          teams={teams}
          memberships={memberships}
          readOnly
        />
      )}
    </AppShell>
  );
}
