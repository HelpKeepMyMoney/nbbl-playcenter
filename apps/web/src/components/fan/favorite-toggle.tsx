"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFanFavorites } from "@/hooks/use-fan-favorites";
import { cn } from "@/lib/utils";

type FavoriteToggleProps = {
  kind: "team" | "player";
  id: string;
  className?: string;
  labeled?: boolean;
};

export function FavoriteToggle({
  kind,
  id,
  className,
  labeled = false,
}: FavoriteToggleProps) {
  const {
    isTeamFavorited,
    isPlayerFavorited,
    toggleFavoriteTeam,
    toggleFavoritePlayer,
    saving,
  } = useFanFavorites();

  const favorited =
    kind === "team" ? isTeamFavorited(id) : isPlayerFavorited(id);

  async function handleClick() {
    if (kind === "team") {
      await toggleFavoriteTeam(id);
    } else {
      await toggleFavoritePlayer(id);
    }
  }

  return (
    <Button
      type="button"
      variant={labeled ? "outline" : "ghost"}
      size={labeled ? "sm" : "icon"}
      className={cn("shrink-0", className)}
      disabled={saving}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleClick();
      }}
    >
      <Star
        className={cn(
          labeled ? "h-4 w-4" : "h-5 w-5",
          favorited ? "fill-nbbl-gold text-nbbl-gold" : "text-gray-400"
        )}
      />
      {labeled ? (favorited ? "Favorited" : "Favorite") : null}
    </Button>
  );
}
