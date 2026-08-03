"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { TeamDetailPane } from "@/components/teams/team-detail-pane";
import { useOrganizations } from "@/hooks/use-participants";
import { useTeam } from "@/hooks/use-teams";
import { useAuthStore } from "@/stores/auth-store";

export default function PlayerTeamPage() {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.teamId;
  const { data: team, isLoading, error } = useTeam(teamId);
  const { data: organizations = [] } = useOrganizations();

  const orgName = team
    ? organizations.find((o) => o.id === team.organizationId)?.name
    : undefined;

  if (!teamId) {
    return (
      <AppShell title="My Team">
        <div className="p-4 lg:p-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">
              No team is linked to your account.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={team?.name ?? "My Team"}>
      {isLoading ? (
        <div className="p-6 text-sm text-gray-500">Loading team...</div>
      ) : error || !team ? (
        <div className="p-4 lg:p-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">
              Team not found.{" "}
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
        <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-white lg:min-h-[calc(100vh-5rem)]">
          <TeamDetailPane
            team={team}
            orgName={orgName}
            readOnly
            getPlayerProfileHref={(id) => `/player/players/${id}`}
          />
        </div>
      )}
    </AppShell>
  );
}
