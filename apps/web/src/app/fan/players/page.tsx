"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FavoriteToggle } from "@/components/fan/favorite-toggle";
import { ParticipantAvatar } from "@/components/participants/participant-avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  useOrganizations,
  useParticipant,
  useParticipantMemberships,
  useParticipants,
} from "@/hooks/use-participants";
import { useTeams } from "@/hooks/use-teams";
import { buildPlayerProfileViewModel } from "@/lib/player-profile-demo";
import { computePlayerStatistics } from "@/lib/player-statistics";
import { cn } from "@/lib/utils";

function PlayerDetail({ participantId }: { participantId: string }) {
  const { data: participant, isLoading } = useParticipant(participantId);
  const { data: memberships = [] } = useParticipantMemberships(participantId);
  const { data: teams = [] } = useTeams();
  const { data: organizations = [] } = useOrganizations();

  if (isLoading || !participant) {
    return (
      <Card className="m-4">
        <CardContent className="py-12 text-center text-sm text-gray-500">
          Loading player…
        </CardContent>
      </Card>
    );
  }

  const teamId = memberships.find((m) => m.role === "player")?.teamId;
  const team = teams.find((t) => t.id === teamId);
  const profile = buildPlayerProfileViewModel(participant, team);
  const stats = computePlayerStatistics(
    participant.gameLog,
    participant.gameSeasonStats
  );
  const orgName = organizations.find((o) => o.id === participant.organizationId)
    ?.name;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-1 gap-5">
          <ParticipantAvatar participant={participant} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {participant.firstName} {participant.lastName}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {profile.position} · {profile.teamLabel}
              {orgName ? ` · ${orgName}` : ""}
            </p>
            {participant.jerseyNumber != null ? (
              <p className="mt-1 text-sm font-semibold text-nbbl-red">
                #{participant.jerseyNumber}
              </p>
            ) : null}
          </div>
        </div>
        <FavoriteToggle kind="player" id={participantId} />
      </div>
      {stats.hasData ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Games Played", stats.gamesPlayed],
            ["Points Per Game", stats.pointsPerGame],
            ["Rebounds Per Game", stats.reboundsPerGame],
            ["Assists Per Game", stats.assistsPerGame],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardContent className="pt-6">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            No game statistics yet. Stats will appear after tournament games are
            played.
          </CardContent>
        </Card>
      )}
      {profile.bio ? (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">{profile.bio}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function FanPlayersPage() {
  const { data: participants = [], isLoading } = useParticipants();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const players = useMemo(
    () => participants.filter((p) => p.type === "player"),
    [participants]
  );

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
    );
  }, [players, search]);

  return (
    <AppShell title="Players">
      <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:min-h-[calc(100vh-5rem)] lg:flex-row">
        <div className="w-full border-b bg-white p-4 lg:w-96 lg:border-b-0 lg:border-r">
          <h1 className="text-xl font-bold text-gray-900">Players</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse athletes and add favorites
          </p>
          <input
            type="search"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
            {isLoading ? (
              <li className="py-4 text-sm text-gray-500">Loading players…</li>
            ) : (
              filteredPlayers.map((player) => (
                <li key={player.id}>
                  <div
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm transition-colors",
                      selectedId === player.id
                        ? "bg-nbbl-red/10 text-nbbl-red"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(player.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left"
                    >
                      <ParticipantAvatar participant={player} size="sm" />
                      <span className="truncate font-medium">
                        {player.firstName} {player.lastName}
                      </span>
                    </button>
                    <FavoriteToggle kind="player" id={player.id} />
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="min-w-0 flex-1 bg-gray-50">
          {selectedId ? (
            <PlayerDetail participantId={selectedId} />
          ) : (
            <Card className="m-4 border-dashed bg-white">
              <CardContent className="py-16 text-center text-sm text-gray-500">
                Select a player to view profile and stats.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
