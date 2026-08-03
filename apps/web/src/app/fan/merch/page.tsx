"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ContentCategoryGrid } from "@/components/fan/content-category-grid";
import { MERCH_CATEGORIES } from "@/lib/fan-content-data";

export default function FanMerchPage() {
  return (
    <AppShell title="Merch">
      <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merch</h1>
          <p className="text-sm text-gray-500">
            Official NBBL merchandise and fan gear
          </p>
        </div>
        <ContentCategoryGrid categories={MERCH_CATEGORIES} kind="merch" />
      </div>
    </AppShell>
  );
}
