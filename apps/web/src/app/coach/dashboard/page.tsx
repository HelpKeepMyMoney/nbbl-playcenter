"use client";

import { AppShell } from "@/components/layout/app-shell";
import { CoachDashboardContent } from "@/components/coach/coach-dashboard-widgets";

export default function CoachDashboardPage() {
  return (
    <AppShell title="Dashboard" showDesktopMenu>
      <CoachDashboardContent />
    </AppShell>
  );
}
