"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ContentCategoryRow } from "@/components/fan/content-category-row";
import { FavoriteToggle } from "@/components/fan/favorite-toggle";
import { ParticipantAvatar } from "@/components/participants/participant-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParticipant } from "@/hooks/use-participants";
import { useTeam } from "@/hooks/use-teams";
import { useFanFavorites } from "@/hooks/use-fan-favorites";
import { getMerchCategory, getVideoCategory } from "@/lib/fan-content-data";
import { useAuthStore } from "@/stores/auth-store";

function FavoriteTeamRow({ teamId }: { teamId: string }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <span className="text-sm font-medium text-gray-900">{team.name}</span>
      <FavoriteToggle kind="team" id={teamId} />
    </div>
  );
}

function FavoritePlayerRow({ participantId }: { participantId: string }) {
  const { data: participant } = useParticipant(participantId);
  if (!participant) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <ParticipantAvatar participant={participant} size="sm" />
        <span className="truncate text-sm font-medium text-gray-900">
          {participant.firstName} {participant.lastName}
        </span>
      </div>
      <FavoriteToggle kind="player" id={participantId} />
    </div>
  );
}

export default function FanProfilePage() {
  const user = useAuthStore((s) => s.user);
  const {
    favoriteTeamIds,
    favoriteParticipantIds,
    favoriteVideoIds,
    interestedMerchIds,
    purchasedMerchIds,
  } = useFanFavorites();

  const favoriteVideos = favoriteVideoIds
    .map((id) => getVideoCategory(id))
    .filter((category): category is NonNullable<typeof category> => !!category);
  const interestedMerch = interestedMerchIds
    .map((id) => getMerchCategory(id))
    .filter((category): category is NonNullable<typeof category> => !!category);
  const purchasedMerch = purchasedMerchIds
    .map((id) => getMerchCategory(id))
    .filter((category): category is NonNullable<typeof category> => !!category);

  return (
    <AppShell title="My Profile">
      <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Your fan account and favorites</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Name:</span>{" "}
              <span className="font-medium">{user?.displayName}</span>
            </p>
            <p>
              <span className="text-gray-500">Email:</span>{" "}
              <span className="font-medium">{user?.email}</span>
            </p>
            <p>
              <span className="text-gray-500">Role:</span>{" "}
              <span className="font-medium">{user?.title ?? "Fan"}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Favorite Teams</CardTitle>
            <Link
              href="/fan/teams"
              className="text-sm font-medium text-nbbl-red hover:underline"
            >
              Browse teams
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {favoriteTeamIds.length === 0 ? (
              <p className="text-sm text-gray-500">No favorite teams yet.</p>
            ) : (
              favoriteTeamIds.map((teamId) => (
                <FavoriteTeamRow key={teamId} teamId={teamId} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Favorite Players</CardTitle>
            <Link
              href="/fan/players"
              className="text-sm font-medium text-nbbl-red hover:underline"
            >
              Browse players
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {favoriteParticipantIds.length === 0 ? (
              <p className="text-sm text-gray-500">No favorite players yet.</p>
            ) : (
              favoriteParticipantIds.map((participantId) => (
                <FavoritePlayerRow
                  key={participantId}
                  participantId={participantId}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Favorite Videos</CardTitle>
            <Link
              href="/fan/videos"
              className="text-sm font-medium text-nbbl-red hover:underline"
            >
              Browse videos
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {favoriteVideos.length === 0 ? (
              <p className="text-sm text-gray-500">No favorite videos yet.</p>
            ) : (
              favoriteVideos.map((category) => (
                <ContentCategoryRow
                  key={category.id}
                  category={category}
                  kind="video"
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Purchased Merch</CardTitle>
            <Link
              href="/fan/merch"
              className="text-sm font-medium text-nbbl-red hover:underline"
            >
              Browse merch
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {purchasedMerch.length === 0 ? (
              <p className="text-sm text-gray-500">No purchased merch yet.</p>
            ) : (
              purchasedMerch.map((category) => (
                <ContentCategoryRow
                  key={category.id}
                  category={category}
                  kind="merch"
                  merchVariant="purchased"
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Interested Merch</CardTitle>
            <Link
              href="/fan/merch"
              className="text-sm font-medium text-nbbl-red hover:underline"
            >
              Browse merch
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {interestedMerch.length === 0 ? (
              <p className="text-sm text-gray-500">
                No interested merch yet.
              </p>
            ) : (
              interestedMerch.map((category) => (
                <ContentCategoryRow
                  key={category.id}
                  category={category}
                  kind="merch"
                  merchVariant="interested"
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
