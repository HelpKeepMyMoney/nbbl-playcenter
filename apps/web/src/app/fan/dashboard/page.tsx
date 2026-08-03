"use client";

import { AppShell } from "@/components/layout/app-shell";
import { FanDashboardContent } from "@/components/fan/fan-dashboard-widgets";

export default function FanDashboardPage() {
  return (
    <AppShell title="Dashboard" showDesktopMenu>
      <FanDashboardContent />
    </AppShell>
  );
}
