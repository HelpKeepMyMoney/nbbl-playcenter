"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommunications } from "@/hooks/use-circuit-data";
import { useUpcomingTournamentGames } from "@/hooks/use-tournaments";
import { cn } from "@/lib/utils";
import { DASHBOARD_TASKS } from "./dashboard-data";

function SectionHeader({ title }: { title: string }) {
  return (
    <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
      <Link href="#" className="text-sm font-medium text-nbbl-red hover:underline">
        View all
      </Link>
    </CardHeader>
  );
}

const taskPriorityClass = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-emerald-50 text-emerald-700",
} as const;

export function UpcomingEventsCard() {
  const { data: games = [], isLoading } = useUpcomingTournamentGames(4);

  return (
    <Card>
      <SectionHeader title="Upcoming Events" />
      <CardContent className="space-y-4 pt-0">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading events…</p>
        ) : games.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming events.</p>
        ) : (
          games.map((game) => {
            const d = new Date(game.scheduledStartAt);
            const month = d
              .toLocaleString("en-US", { month: "short" })
              .toUpperCase();
            const day = String(d.getDate());
            const time = d.toLocaleString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <div key={game.id} className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-900 text-center text-white">
                  <span className="text-[9px] font-semibold leading-none">
                    {month}
                  </span>
                  <span className="text-lg font-bold leading-tight">{day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{game.matchup}</p>
                  <p className="text-sm text-gray-500">
                    {time} · {game.tournamentTitle}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function TasksCard() {
  return (
    <Card>
      <SectionHeader title="Tasks" />
      <CardContent className="space-y-4 pt-0">
        {DASHBOARD_TASKS.map((task) => (
          <div key={task.title} className="flex items-start gap-3">
            <span
              className="mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{task.title}</p>
              <span
                className={cn(
                  "mt-1 inline-flex rounded px-2 py-0.5 text-[11px] font-medium",
                  taskPriorityClass[task.tone]
                )}
              >
                {task.priority}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentActivityCard() {
  const { data: communications = [] } = useCommunications(4);

  return (
    <Card>
      <SectionHeader title="Recent Activity" />
      <CardContent className="space-y-4 pt-0">
        {communications.length === 0 ? (
          <p className="text-sm text-gray-500">No recent communications.</p>
        ) : (
          communications.map((item) => {
            const Icon = MessageSquare;
            return (
              <div key={item.id} className="flex gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    "bg-violet-100 text-violet-600"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {item.subject}
                    </p>
                    <span className="shrink-0 text-xs text-gray-400">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{item.body}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
