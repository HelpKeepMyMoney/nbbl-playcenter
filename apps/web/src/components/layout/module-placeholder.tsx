"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ModulePlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <AppShell title={title}>
      <div className="p-6">
        {description ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {description}
          </p>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            This PlayCenter module is planned for a future milestone. Participants
            and Teams are available now with Firebase emulator integration.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
