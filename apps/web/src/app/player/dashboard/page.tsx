"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PlayerDashboardContent } from "@/components/player/player-dashboard-widgets";

export default function PlayerDashboardPage() {
  return (
    <AppShell title="Dashboard" showDesktopMenu>
      <PlayerDashboardContent />
    </AppShell>
  );
}
