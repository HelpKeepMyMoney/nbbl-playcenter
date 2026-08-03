"use client";

import { useMutation } from "@tanstack/react-query";
import type { UpdateFanFavoritesInput } from "@nbbl/shared";
import { callFunction } from "@/lib/callables";
import { useAuthStore } from "@/stores/auth-store";

function buildFavoritesInput(
  user: ReturnType<typeof useAuthStore.getState>["user"],
  overrides: Partial<{
    favoriteTeamIds: string[];
    favoriteParticipantIds: string[];
    favoriteVideoIds: string[];
    interestedMerchIds: string[];
    purchasedMerchIds: string[];
  }> = {}
): UpdateFanFavoritesInput {
  return {
    favoriteTeamIds: overrides.favoriteTeamIds ?? user?.favoriteTeamIds ?? [],
    favoriteParticipantIds:
      overrides.favoriteParticipantIds ?? user?.favoriteParticipantIds ?? [],
    favoriteVideoIds:
      overrides.favoriteVideoIds ?? user?.favoriteVideoIds ?? [],
    interestedMerchIds:
      overrides.interestedMerchIds ?? user?.interestedMerchIds ?? [],
    purchasedMerchIds:
      overrides.purchasedMerchIds ?? user?.purchasedMerchIds ?? [],
  } as UpdateFanFavoritesInput;
}

export function useFanFavorites() {
  const user = useAuthStore((s) => s.user);
  const setFavorites = useAuthStore((s) => s.setFavorites);

  const favoriteTeamIds = user?.favoriteTeamIds ?? [];
  const favoriteParticipantIds = user?.favoriteParticipantIds ?? [];
  const favoriteVideoIds = user?.favoriteVideoIds ?? [];
  const interestedMerchIds = user?.interestedMerchIds ?? [];
  const purchasedMerchIds = user?.purchasedMerchIds ?? [];

  const saveMutation = useMutation({
    mutationFn: async (input: UpdateFanFavoritesInput) =>
      callFunction<UpdateFanFavoritesInput, UpdateFanFavoritesInput>(
        "updateFanFavorites",
        input
      ),
    onSuccess: (data) => {
      setFavorites(data);
    },
  });

  async function saveFavorites(input: UpdateFanFavoritesInput) {
    return saveMutation.mutateAsync(input);
  }

  function isTeamFavorited(teamId: string) {
    return favoriteTeamIds.includes(teamId);
  }

  function isPlayerFavorited(participantId: string) {
    return favoriteParticipantIds.includes(participantId);
  }

  function isVideoFavorited(videoId: string) {
    return favoriteVideoIds.includes(videoId);
  }

  function isMerchInterested(merchId: string) {
    return interestedMerchIds.includes(merchId);
  }

  function isMerchPurchased(merchId: string) {
    return purchasedMerchIds.includes(merchId);
  }

  async function toggleFavoriteTeam(teamId: string) {
    const next = isTeamFavorited(teamId)
      ? favoriteTeamIds.filter((id) => id !== teamId)
      : [...favoriteTeamIds, teamId];
    return saveFavorites(
      buildFavoritesInput(user, { favoriteTeamIds: next })
    );
  }

  async function toggleFavoritePlayer(participantId: string) {
    const next = isPlayerFavorited(participantId)
      ? favoriteParticipantIds.filter((id) => id !== participantId)
      : [...favoriteParticipantIds, participantId];
    return saveFavorites(
      buildFavoritesInput(user, { favoriteParticipantIds: next })
    );
  }

  async function toggleFavoriteVideo(videoId: string) {
    const next = isVideoFavorited(videoId)
      ? favoriteVideoIds.filter((id) => id !== videoId)
      : [...favoriteVideoIds, videoId];
    return saveFavorites(
      buildFavoritesInput(user, { favoriteVideoIds: next })
    );
  }

  async function toggleInterestedMerch(merchId: string) {
    const next = isMerchInterested(merchId)
      ? interestedMerchIds.filter((id) => id !== merchId)
      : [...interestedMerchIds, merchId];
    return saveFavorites(
      buildFavoritesInput(user, { interestedMerchIds: next })
    );
  }

  async function togglePurchasedMerch(merchId: string) {
    const next = isMerchPurchased(merchId)
      ? purchasedMerchIds.filter((id) => id !== merchId)
      : [...purchasedMerchIds, merchId];
    return saveFavorites(
      buildFavoritesInput(user, { purchasedMerchIds: next })
    );
  }

  return {
    favoriteTeamIds,
    favoriteParticipantIds,
    favoriteVideoIds,
    interestedMerchIds,
    purchasedMerchIds,
    isTeamFavorited,
    isPlayerFavorited,
    isVideoFavorited,
    isMerchInterested,
    isMerchPurchased,
    toggleFavoriteTeam,
    toggleFavoritePlayer,
    toggleFavoriteVideo,
    toggleInterestedMerch,
    togglePurchasedMerch,
    saveFavorites,
    saving: saveMutation.isPending,
  };
}
