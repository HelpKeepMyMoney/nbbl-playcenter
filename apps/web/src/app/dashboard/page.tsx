"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  MembershipStatusChart,
  RevenueOverviewChart,
} from "@/components/dashboard/dashboard-charts";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi";
import {
  RecentActivityCard,
  TasksCard,
  UpcomingEventsCard,
} from "@/components/dashboard/dashboard-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrentMonthRange } from "@/lib/format-date-range";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.displayName?.split(" ")[0] ?? "Jason";
  const monthRange = formatCurrentMonthRange();

  return (
    <AppShell title="Dashboard" showDesktopMenu>
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Welcome back, {firstName}!{" "}
              <span role="img" aria-label="wave">
                👋
              </span>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Here&apos;s what&apos;s happening across your organization.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <CalendarDays className="h-4 w-4 text-gray-500" />
            {monthRange}
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <DashboardKpiGrid />

        <div className="grid gap-4 xl:grid-cols-3">
          <UpcomingEventsCard />
          <TasksCard />
          <RecentActivityCard />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">
                Revenue Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueOverviewChart />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">
                Membership Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MembershipStatusChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
