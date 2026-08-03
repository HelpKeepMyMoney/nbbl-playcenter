"use client";

import { Check, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFanFavorites } from "@/hooks/use-fan-favorites";
import { cn } from "@/lib/utils";

type ContentFavoriteToggleProps = {
  kind: "video" | "merch-interested" | "merch-purchased";
  id: string;
  className?: string;
};

export function ContentFavoriteToggle({
  kind,
  id,
  className,
}: ContentFavoriteToggleProps) {
  const {
    isVideoFavorited,
    isMerchInterested,
    isMerchPurchased,
    toggleFavoriteVideo,
    toggleInterestedMerch,
    togglePurchasedMerch,
    saving,
  } = useFanFavorites();

  const active =
    kind === "video"
      ? isVideoFavorited(id)
      : kind === "merch-interested"
        ? isMerchInterested(id)
        : isMerchPurchased(id);

  const label =
    kind === "video"
      ? active
        ? "Remove from favorite videos"
        : "Add to favorite videos"
      : kind === "merch-interested"
        ? active
          ? "Remove from interested merch"
          : "Mark merch as interested"
        : active
          ? "Remove from purchased merch"
          : "Mark merch as purchased";

  async function handleClick() {
    if (kind === "video") {
      await toggleFavoriteVideo(id);
    } else if (kind === "merch-interested") {
      await toggleInterestedMerch(id);
    } else {
      await togglePurchasedMerch(id);
    }
  }

  const Icon = kind === "video" ? Star : kind === "merch-interested" ? Heart : Check;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      disabled={saving}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleClick();
      }}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          active
            ? kind === "video"
              ? "fill-nbbl-gold text-nbbl-gold"
              : kind === "merch-interested"
                ? "fill-nbbl-red text-nbbl-red"
                : "text-green-600"
            : "text-gray-400"
        )}
      />
    </Button>
  );
}
