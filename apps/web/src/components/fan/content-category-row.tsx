"use client";

import type { ContentCategory } from "@/lib/fan-content-data";
import { ContentFavoriteToggle } from "@/components/fan/content-favorite-toggle";

export function ContentCategoryRow({
  category,
  kind,
  merchVariant,
}: {
  category: ContentCategory;
  kind: "video" | "merch";
  merchVariant?: "interested" | "purchased";
}) {
  const Icon = category.icon;

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Icon className="h-4 w-4 text-nbbl-red" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {category.title}
          </p>
          <p className="truncate text-xs text-gray-500">
            {category.description}
          </p>
        </div>
      </div>
      {kind === "video" ? (
        <ContentFavoriteToggle kind="video" id={category.id} />
      ) : (
        <ContentFavoriteToggle
          kind={
            merchVariant === "purchased" ? "merch-purchased" : "merch-interested"
          }
          id={category.id}
        />
      )}
    </div>
  );
}
