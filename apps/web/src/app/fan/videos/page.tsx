"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ContentCategoryGrid } from "@/components/fan/content-category-grid";
import { VIDEO_CATEGORIES } from "@/lib/fan-content-data";

export default function FanVideosPage() {
  return (
    <AppShell title="Videos">
      <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Videos</h1>
          <p className="text-sm text-gray-500">
            Watch highlights, full games, tournaments, and more
          </p>
        </div>
        <ContentCategoryGrid categories={VIDEO_CATEGORIES} kind="video" />
      </div>
    </AppShell>
  );
}
