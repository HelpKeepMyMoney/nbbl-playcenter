"use client";

import type { ContentCategory } from "@/lib/fan-content-data";
import { ContentFavoriteToggle } from "@/components/fan/content-favorite-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ContentCategoryGrid({
  categories,
  kind,
}: {
  categories: readonly ContentCategory[];
  kind: "video" | "merch";
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Card
            key={category.id}
            className="transition-shadow hover:shadow-md"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Icon className="h-5 w-5 text-nbbl-red" />
                </div>
                <div className="flex items-center gap-1">
                  {category.count != null ? (
                    <Badge variant="muted">{category.count} items</Badge>
                  ) : null}
                  {kind === "video" ? (
                    <ContentFavoriteToggle kind="video" id={category.id} />
                  ) : (
                    <>
                      <ContentFavoriteToggle
                        kind="merch-interested"
                        id={category.id}
                      />
                      <ContentFavoriteToggle
                        kind="merch-purchased"
                        id={category.id}
                      />
                    </>
                  )}
                </div>
              </div>
              <CardTitle className="text-base">{category.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-500">{category.description}</p>
              <p className="mt-3 text-xs text-gray-400">
                {kind === "video"
                  ? "Star to save to favorite videos"
                  : "Heart for interested · checkmark for purchased"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
