"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/hooks/use-teams";
import { useTeamTournamentMatches } from "@/hooks/use-tournaments";
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

export default function PlayerSchedulePage() {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.teamId;
  const { data: team } = useTeam(teamId);
  const { data: games = [], isLoading, isError, error } =
    useTeamTournamentMatches(teamId);

  const scheduleByDate = useMemo(() => {
    const grouped = new Map<string, typeof games>();
    for (const game of games) {
      const dateKey = game.scheduledStartAt.slice(0, 10);
      const list = grouped.get(dateKey) ?? [];
      list.push(game);
      grouped.set(dateKey, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [games]);

  return (
    <AppShell title="Schedule">
      <div className="mx-auto max-w-6xl space-y-8 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <p className="text-sm text-gray-500">
            Tournament games for {team?.name ?? "your team"}
          </p>
        </div>

        {team?.practiceDays && team.practiceDays.length > 0 ? (
          <div className="rounded-xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Practice Days
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {team.practiceDays.join(", ")} at{" "}
              {team.homeFacilityName ?? "NBBL Academy"}
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-gray-500">Loading schedule…</p>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            Could not load schedule:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : scheduleByDate.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
            No tournament games scheduled for your team.
          </div>
        ) : (
          scheduleByDate.map(([date, dayGames]) => (
            <section key={date} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {formatScheduleDate(date)}
              </h2>
              <ul className="divide-y divide-gray-100 rounded-xl border bg-white">
                {dayGames.map((game) => (
                  <li
                    key={game.id}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatMatchupLabel(game)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {game.tournamentTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">
                        {formatMatchPhase(game.phase, game.playoffRound)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {formatMatchTime(game.scheduledStartAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}
