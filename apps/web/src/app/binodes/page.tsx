"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { useBinodes } from "@/hooks/use-circuit-data";

export default function BinodesPage() {
  const { data: binodes = [], isLoading } = useBinodes();

  return (
    <AppShell title="BINodes">
      <div className="space-y-4 p-4 lg:p-6">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading BINodes...</p>
        ) : binodes.length === 0 ? (
          <p className="text-sm text-gray-500">No BINodes found.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {binodes.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="font-semibold text-gray-900">
                    {b.displayName ?? b.code}
                  </p>
                  <p className="text-sm text-gray-500">
                    {b.facilityName ?? b.facilityId}
                  </p>
                </div>
                <Badge variant="success">Active</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
