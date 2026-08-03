"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { useTeams } from "@/hooks/use-teams";
import { useTournamentSchedulesByDate } from "@/hooks/use-tournaments";
import {
  formatMatchPhase,
  formatMatchTime,
  formatMatchupLabel,
} from "@/lib/tournament-match-display";
import { useAuthStore } from "@/stores/auth-store";

function formatScheduleDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function FanSchedulePage() {
  const user = useAuthStore((s) => s.user);
  const favoriteTeamIds = useMemo(
    () => user?.favoriteTeamIds ?? [],
    [user?.favoriteTeamIds]
  );
  const { data: teams = [] } = useTeams();
  const { data: scheduleDays = [], isLoading, isError, error } =
    useTournamentSchedulesByDate();

  const favoriteTeamNames = useMemo(() => {
    const names = new Set<string>();
    for (const teamId of favoriteTeamIds) {
      const team = teams.find((t) => t.id === teamId);
      if (team) names.add(team.name.toLowerCase());
    }
    return names;
  }, [favoriteTeamIds, teams]);

  function isFavoriteMatch(homeTeamName: string, awayTeamName: string) {
    if (favoriteTeamNames.size === 0) return false;
    return (
      favoriteTeamNames.has(homeTeamName.toLowerCase()) ||
      favoriteTeamNames.has(awayTeamName.toLowerCase())
    );
  }

  return (
    <AppShell title="Schedule">
      <div className="mx-auto max-w-6xl space-y-8 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold">League Schedule</h1>
          <p className="text-sm text-gray-500">
            Tournament games across NBBL Circuit 1
          </p>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading schedule…</p>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            Could not load schedule:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : scheduleDays.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
            No tournament games scheduled.
          </div>
        ) : (
          scheduleDays.map((day) => (
            <section key={day.date} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {formatScheduleDate(day.date)}
              </h2>
              {day.tournaments.map(({ tournament, matches }) => (
                <div key={tournament.id} className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {tournament.title}
                  </p>
                  <ul className="divide-y divide-gray-100 rounded-xl border bg-white">
                    {matches.map((game) => {
                      const favorite = isFavoriteMatch(
                        game.homeTeamName,
                        game.awayTeamName
                      );
                      return (
                        <li
                          key={game.id}
                          className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatMatchupLabel(game)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {favorite ? (
                              <Badge variant="success">Favorite</Badge>
                            ) : null}
                            <Badge variant="muted">
                              {formatMatchPhase(game.phase, game.playoffRound)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {formatMatchTime(game.scheduledStartAt)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}
