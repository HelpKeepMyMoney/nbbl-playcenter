"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantAvatar } from "@/components/participants/participant-avatar";
import { useParticipant, useParticipantMemberships } from "@/hooks/use-participants";
import { useTeam } from "@/hooks/use-teams";
import { useTeams } from "@/hooks/use-teams";
import {
  useTeamTournamentMatches,
  useUpcomingTournamentGames,
} from "@/hooks/use-tournaments";
import { buildPlayerProfileViewModel } from "@/lib/player-profile-demo";
import { computePlayerStatistics } from "@/lib/player-statistics";
import {
  getMerchCategory,
  getVideoCategory,
  type ContentCategory,
} from "@/lib/fan-content-data";
import {
  computeTeamRecordFromMatches,
  formatMatchTime,
  formatMatchupLabel,
} from "@/lib/tournament-match-display";
import { useAuthStore } from "@/stores/auth-store";

function FavoriteTeamCard({ teamId }: { teamId: string }) {
  const { data: team } = useTeam(teamId);
  const { data: games = [] } = useTeamTournamentMatches(teamId);
  const record = computeTeamRecordFromMatches(teamId, games);
  const nextGame = games
    .filter((g) => new Date(g.scheduledStartAt) >= new Date())
    .sort((a, b) => a.scheduledStartAt.localeCompare(b.scheduledStartAt))[0];

  if (!team) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-gray-500">Favorite Team</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{team.name}</p>
        <p className="text-sm text-gray-500">
          {record.wins}W – {record.losses}L
        </p>
        {nextGame ? (
          <p className="mt-2 text-xs text-gray-500">
            Next: {formatMatchupLabel(nextGame)} ·{" "}
            {formatMatchTime(nextGame.scheduledStartAt)}
          </p>
        ) : null}
        <Link
          href="/fan/teams"
          className="mt-3 inline-block text-sm font-medium text-nbbl-red hover:underline"
        >
          View team
        </Link>
      </CardContent>
    </Card>
  );
}

function FavoritePlayerCard({ participantId }: { participantId: string }) {
  const { data: participant } = useParticipant(participantId);
  const { data: memberships = [] } = useParticipantMemberships(participantId);
  const teamId = memberships.find((m) => m.role === "player")?.teamId;
  const { data: team } = useTeam(teamId);

  if (!participant) return null;

  const profile = buildPlayerProfileViewModel(participant, team ?? undefined);
  const stats = computePlayerStatistics(
    participant.gameLog,
    participant.gameSeasonStats
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-gray-500">Favorite Player</p>
        <div className="mt-2 flex items-center gap-3">
          <ParticipantAvatar participant={participant} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-gray-900">
              {participant.firstName} {participant.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {profile.position} · {profile.teamLabel}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {stats.hasData
            ? `${stats.pointsPerGame} PPG · ${stats.reboundsPerGame} RPG`
            : "No stats yet"}
        </p>
        <Link
          href="/fan/players"
          className="mt-3 inline-block text-sm font-medium text-nbbl-red hover:underline"
        >
          View players
        </Link>
      </CardContent>
    </Card>
  );
}

function ContentCategoryCard({
  category,
  label,
  href,
}: {
  category: ContentCategory;
  label: string;
  href: string;
}) {
  const Icon = category.icon;

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Icon className="h-5 w-5 text-nbbl-red" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-gray-900">
              {category.title}
            </p>
            <p className="text-sm text-gray-500">{category.description}</p>
          </div>
        </div>
        <Link
          href={href}
          className="mt-3 inline-block text-sm font-medium text-nbbl-red hover:underline"
        >
          View {href.includes("videos") ? "videos" : "merch"}
        </Link>
      </CardContent>
    </Card>
  );
}

export function FanDashboardContent() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.displayName?.split(" ")[0] ?? "Fan";
  const favoriteTeamIds = user?.favoriteTeamIds ?? [];
  const favoriteParticipantIds = user?.favoriteParticipantIds ?? [];
  const favoriteVideoIds = user?.favoriteVideoIds ?? [];
  const interestedMerchIds = user?.interestedMerchIds ?? [];
  const purchasedMerchIds = user?.purchasedMerchIds ?? [];
  const { data: teams = [] } = useTeams();
  const { data: upcomingGames = [], isLoading } = useUpcomingTournamentGames(8);

  const favoriteTeamNames = favoriteTeamIds
    .map((id) => teams.find((t) => t.id === id)?.name.toLowerCase())
    .filter((name): name is string => !!name);

  const favoriteGames = upcomingGames.filter((game) => {
    const matchup = game.matchup.toLowerCase();
    return favoriteTeamNames.some((name) => matchup.includes(name));
  });

  const displayGames =
    favoriteGames.length > 0 ? favoriteGames.slice(0, 4) : upcomingGames.slice(0, 4);

  const favoriteVideos = favoriteVideoIds
    .map((id) => getVideoCategory(id))
    .filter((category): category is NonNullable<typeof category> => !!category);
  const interestedMerch = interestedMerchIds
    .map((id) => getMerchCategory(id))
    .filter((category): category is NonNullable<typeof category> => !!category);
  const purchasedMerch = purchasedMerchIds
    .map((id) => getMerchCategory(id))
    .filter((category): category is NonNullable<typeof category> => !!category);

  const hasFavorites =
    favoriteTeamIds.length > 0 ||
    favoriteParticipantIds.length > 0 ||
    favoriteVideos.length > 0 ||
    interestedMerch.length > 0 ||
    purchasedMerch.length > 0;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome back, {firstName}!{" "}
          <span role="img" aria-label="wave">
            👋
          </span>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Follow your favorite teams, players, videos, and merch across NBBL
          Circuit 1.
        </p>
      </div>

      {hasFavorites ? (
        <div className="space-y-4">
          {favoriteTeamIds.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                My Teams
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favoriteTeamIds.map((teamId) => (
                  <FavoriteTeamCard key={teamId} teamId={teamId} />
                ))}
              </div>
            </div>
          ) : null}

          {favoriteParticipantIds.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                My Players
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favoriteParticipantIds.map((participantId) => (
                  <FavoritePlayerCard
                    key={participantId}
                    participantId={participantId}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {favoriteVideos.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Favorite Videos
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favoriteVideos.map((category) => (
                  <ContentCategoryCard
                    key={category.id}
                    category={category}
                    label="Favorite Video"
                    href="/fan/videos"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {purchasedMerch.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Purchased Merch
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {purchasedMerch.map((category) => (
                  <ContentCategoryCard
                    key={category.id}
                    category={category}
                    label="Purchased"
                    href="/fan/merch"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {interestedMerch.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Interested Merch
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {interestedMerch.map((category) => (
                  <ContentCategoryCard
                    key={category.id}
                    category={category}
                    label="Interested"
                    href="/fan/merch"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            No favorites yet.{" "}
            <Link href="/fan/teams" className="text-nbbl-red hover:underline">
              Browse teams
            </Link>
            ,{" "}
            <Link href="/fan/players" className="text-nbbl-red hover:underline">
              players
            </Link>
            ,{" "}
            <Link href="/fan/videos" className="text-nbbl-red hover:underline">
              videos
            </Link>
            , or{" "}
            <Link href="/fan/merch" className="text-nbbl-red hover:underline">
              merch
            </Link>{" "}
            to get started.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">
              Upcoming Games
            </CardTitle>
            <Link
              href="/fan/schedule"
              className="text-sm font-medium text-nbbl-red hover:underline"
            >
              View schedule
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading games…</p>
            ) : displayGames.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming games scheduled.</p>
            ) : (
              displayGames.map((game) => {
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
                      <p className="font-medium text-gray-900">{game.matchup}</p>
                      <p className="text-sm text-gray-500">
                        {formatMatchTime(game.scheduledStartAt)} ·{" "}
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0 sm:grid-cols-2">
            {[
              ["/fan/videos", "Videos"],
              ["/fan/merch", "Merch"],
              ["/fan/schedule", "Schedule"],
              ["/fan/tournaments", "Tournaments"],
              ["/fan/teams", "Teams"],
              ["/fan/profile", "My Profile"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
