"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FavoriteToggle } from "@/components/fan/favorite-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { TeamDetailPane } from "@/components/teams/team-detail-pane";
import { useOrganizations } from "@/hooks/use-participants";
import { useTeams } from "@/hooks/use-teams";
import { cn } from "@/lib/utils";

export default function FanTeamsPage() {
  const { data: teams = [], isLoading } = useTeams();
  const { data: organizations = [] } = useOrganizations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const orgMap = useMemo(
    () => new Map(organizations.map((o) => [o.id, o.name])),
    [organizations]
  );

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((team) => team.name.toLowerCase().includes(q));
  }, [teams, search]);

  const selectedTeam = teams.find((t) => t.id === selectedId);
  const selectedOrgName = selectedTeam
    ? orgMap.get(selectedTeam.organizationId)
    : undefined;

  return (
    <AppShell title="Teams">
      <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:min-h-[calc(100vh-5rem)] lg:flex-row">
        <div className="w-full border-b bg-white p-4 lg:w-96 lg:border-b-0 lg:border-r">
          <h1 className="text-xl font-bold text-gray-900">Teams</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse Circuit 1 teams and add favorites
          </p>
          <input
            type="search"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
            {isLoading ? (
              <li className="py-4 text-sm text-gray-500">Loading teams…</li>
            ) : (
              filteredTeams.map((team) => (
                <li key={team.id}>
                  <div
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm transition-colors",
                      selectedId === team.id
                        ? "bg-nbbl-red/10 text-nbbl-red"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(team.id)}
                      className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left font-medium"
                    >
                      {team.name}
                    </button>
                    <FavoriteToggle kind="team" id={team.id} />
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="min-w-0 flex-1 bg-white">
          {selectedTeam ? (
            <div className="relative">
              <div className="absolute right-4 top-4 z-10">
                <FavoriteToggle kind="team" id={selectedTeam.id} />
              </div>
              <TeamDetailPane
                team={selectedTeam}
                orgName={selectedOrgName}
                readOnly
                getPlayerProfileHref={(id) => `/fan/players/${id}`}
              />
            </div>
          ) : (
            <Card className="m-4 border-dashed">
              <CardContent className="py-16 text-center text-sm text-gray-500">
                Select a team to view roster and details.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
