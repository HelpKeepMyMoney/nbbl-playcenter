"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { useFacilities } from "@/hooks/use-circuit-data";

export default function FacilitiesPage() {
  const { data: facilities = [], isLoading } = useFacilities();

  return (
    <AppShell title="Facilities">
      <div className="space-y-4 p-4 lg:p-6">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading facilities...</p>
        ) : facilities.length === 0 ? (
          <p className="text-sm text-gray-500">No facilities found.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {facilities.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="font-semibold text-gray-900">
                    {f.displayName ?? f.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {f.city}, {f.state} · {f.code}
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
