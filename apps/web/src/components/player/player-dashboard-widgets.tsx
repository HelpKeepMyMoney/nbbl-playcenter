"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParticipant } from "@/hooks/use-participants";
import { useTeam } from "@/hooks/use-teams";
import { useTeamTournamentMatches } from "@/hooks/use-tournaments";
import {
  formatMatchPhase,
  formatMatchTime,
  formatMatchupLabel,
} from "@/lib/tournament-match-display";
import { buildPlayerProfileViewModel } from "@/lib/player-profile-demo";
import { useAuthStore } from "@/stores/auth-store";

export function PlayerDashboardContent() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.displayName?.split(" ")[0] ?? "Player";
  const { data: participant } = useParticipant(user?.participantId);
  const { data: team } = useTeam(user?.teamId);
  const { data: games = [], isLoading: gamesLoading } = useTeamTournamentMatches(
    user?.teamId
  );

  const upcomingGames = games
    .filter((g) => new Date(g.scheduledStartAt) >= new Date())
    .slice(0, 4);

  const profile = participant
    ? buildPlayerProfileViewModel(participant, team)
    : null;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome back, {firstName}!{" "}
          <span role="img" aria-label="wave">👋</span>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s your schedule, stats, and team updates.
        </p>
      </div>

      {profile ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Games Played", profile.seasonStats.gamesPlayed],
            ["Points Per Game", profile.seasonStats.pointsPerGame],
            ["Rebounds Per Game", profile.seasonStats.reboundsPerGame],
            ["Assists Per Game", profile.seasonStats.assistsPerGame],
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
              Upcoming Games
            </CardTitle>
            <Link
              href="/player/schedule"
              className="text-sm font-medium text-nbbl-red hover:underline"
            >
              View schedule
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {gamesLoading ? (
              <p className="text-sm text-gray-500">Loading games…</p>
            ) : upcomingGames.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming games scheduled.</p>
            ) : (
              upcomingGames.map((game) => {
                const d = new Date(game.scheduledStartAt);
                const month = d
                  .toLocaleString("en-US", { month: "short" })
                  .toUpperCase();
                const day = String(d.getDate());
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
              href="/player/profile"
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              My Profile
            </Link>
            <Link
              href="/player/team"
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
              href="/player/membership"
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Membership
            </Link>
            <Link
              href="/player/documents"
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Documents
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
