"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerProfileView } from "@/components/participants/player-profile-view";
import {
  useOrganizations,
  useParticipant,
  useParticipantMemberships,
} from "@/hooks/use-participants";
import { useParticipantPlayerMembership } from "@/hooks/use-player-memberships";
import { useTeams } from "@/hooks/use-teams";

export default function CoachPlayerProfilePage() {
  const params = useParams();
  const participantId = params.participantId as string;
  const { data: participant, isLoading, error } = useParticipant(participantId);
  const { data: organizations = [] } = useOrganizations();
  const { data: memberships = [] } = useParticipantMemberships(participantId);
  const { data: playerMembership } = useParticipantPlayerMembership(participantId);
  const { data: teams = [] } = useTeams();

  const fullName = participant
    ? `${participant.firstName} ${participant.lastName}`
    : "Player";

  return (
    <AppShell
      title={fullName}
      breadcrumb={[
        { label: "My Team", href: "/coach/team" },
        { label: fullName },
      ]}
    >
      {isLoading ? (
        <div className="p-6 text-sm text-gray-500">Loading profile...</div>
      ) : error || !participant ? (
        <div className="p-4 lg:p-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">
              Player not found.{" "}
              <Link href="/coach/team" className="text-nbbl-red hover:underline">
                Return to team
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
          playerMembership={playerMembership}
          readOnly
        />
      )}
    </AppShell>
  );
}
