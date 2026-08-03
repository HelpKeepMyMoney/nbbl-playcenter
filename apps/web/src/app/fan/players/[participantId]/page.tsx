"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { FavoriteToggle } from "@/components/fan/favorite-toggle";
import { PlayerProfileView } from "@/components/participants/player-profile-view";
import {
  useOrganizations,
  useParticipant,
  useParticipantMemberships,
} from "@/hooks/use-participants";
import { useParticipantPlayerMembership } from "@/hooks/use-player-memberships";
import { useTeams } from "@/hooks/use-teams";

export default function FanPlayerProfilePage() {
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
        { label: "Teams", href: "/fan/teams" },
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
              <Link href="/fan/teams" className="text-nbbl-red hover:underline">
                Return to teams
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
          headerActions={
            <FavoriteToggle kind="player" id={participantId} labeled />
          }
        />
      )}
    </AppShell>
  );
}
