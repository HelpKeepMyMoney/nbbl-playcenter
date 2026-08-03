"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeam, useTeamMemberships } from "@/hooks/use-teams";
import { useTeamTournamentMatches } from "@/hooks/use-tournaments";
import {
  computeTeamRecordFromMatches,
  formatMatchPhase,
  formatMatchTime,
  formatMatchupLabel,
} from "@/lib/tournament-match-display";
import { useAuthStore } from "@/stores/auth-store";

export function CoachDashboardContent() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.displayName?.split(" ")[0] ?? "Coach";
  const teamId = user?.teamId;
  const { data: team } = useTeam(teamId);
  const { data: memberships = [] } = useTeamMemberships(teamId);
  const { data: games = [], isLoading: gamesLoading } =
    useTeamTournamentMatches(teamId);

  const playerCount = memberships.filter((m) => m.role === "player").length;
  const record = teamId
    ? computeTeamRecordFromMatches(teamId, games)
    : { wins: 0, losses: 0, gamesPlayed: 0 };

  const now = Date.now();
  const recentGames = [...games]
    .filter(
      (g) =>
        g.status === "completed" ||
        new Date(g.scheduledStartAt).getTime() < now
    )
    .sort((a, b) => b.scheduledStartAt.localeCompare(a.scheduledStartAt))
    .slice(0, 4);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome back, Coach {firstName}!{" "}
          <span role="img" aria-label="wave">👋</span>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your team, roster, and tournament results.
        </p>
      </div>

      {team ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Wins", record.wins],
            ["Losses", record.losses],
            ["Games Played", record.gamesPlayed],
            ["Roster Size", playerCount],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardContent className="pt-6">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">
              Recent Games
            </CardTitle>
            <Link
              href="/coach/schedule"
              className="text-sm font-medium text-nbbl-red hover:underline"
            >
              View full schedule
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {gamesLoading ? (
              <p className="text-sm text-gray-500">Loading games…</p>
            ) : recentGames.length === 0 ? (
              <p className="text-sm text-gray-500">No games played yet.</p>
            ) : (
              recentGames.map((game) => {
                const d = new Date(game.scheduledStartAt);
                const month = d
                  .toLocaleString("en-US", { month: "short" })
                  .toUpperCase();
                const day = String(d.getDate());
                const hasScore =
                  game.status === "completed" &&
                  game.homeScore != null &&
                  game.awayScore != null;
                return (
                  <div key={game.id} className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-900 text-center text-white">
                      <span className="text-[9px] font-semibold leading-none">
                        {month}
                      </span>
                      <span className="text-lg font-bold leading-tight">{day}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {formatMatchupLabel(game)}
                        {hasScore ? (
                          <span className="ml-2 text-gray-500">
                            ({game.homeScore}–{game.awayScore})
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatMatchTime(game.scheduledStartAt)} ·{" "}
                        {formatMatchPhase(game.phase, game.playoffRound)} ·{" "}
                        {game.tournamentTitle}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0 sm:grid-cols-2">
            <Link
              href="/coach/team"
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              My Team
              {team ? (
                <span className="mt-0.5 block text-xs font-normal text-gray-500">
                  {team.name}
                </span>
              ) : null}
            </Link>
            <Link
              href="/coach/profile"
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              My Profile
            </Link>
            <Link
              href="/coach/schedule"
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Schedule
            </Link>
            <Link
              href="/coach/messages"
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Messages
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
