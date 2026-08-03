"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { TournamentSchedulePreview } from "@/components/tournaments/tournament-schedule-preview";
import { useTournamentSchedulesByDate } from "@/hooks/use-tournaments";

function formatScheduleDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SchedulesContent() {
  const searchParams = useSearchParams();
  const highlightDate = searchParams.get("date");
  const { data: scheduleDays = [], isLoading, isError, error } =
    useTournamentSchedulesByDate();

  useEffect(() => {
    if (!highlightDate || isLoading) return;
    document
      .getElementById(`schedule-date-${highlightDate}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightDate, isLoading, scheduleDays.length]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Schedules</h1>
        <p className="text-sm text-gray-500">All tournament games by date</p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading schedule…</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          Could not load schedules:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      ) : scheduleDays.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
          No tournament games scheduled.
          <div className="mt-4">
            <Link href="/tournaments" className="text-nbbl-red hover:underline">
              View all tournaments
            </Link>
          </div>
        </div>
      ) : (
        scheduleDays.map((day) => (
          <section
            key={day.date}
            id={`schedule-date-${day.date}`}
            className="scroll-mt-24 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {formatScheduleDate(day.date)}
            </h2>

            {day.tournaments.map(({ tournament, matches }) => (
              <div key={tournament.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/tournaments/${tournament.id}`}
                    className="font-medium text-nbbl-red hover:underline"
                  >
                    {tournament.title}
                  </Link>
                  <Badge variant="muted">{tournament.tournamentStatus}</Badge>
                </div>
                <TournamentSchedulePreview
                  matches={matches}
                  tournament={tournament}
                />
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

export default function SchedulesPage() {
  return (
    <AppShell title="Schedules">
      <Suspense
        fallback={
          <div className="p-8 text-gray-500">Loading schedules…</div>
        }
      >
        <SchedulesContent />
      </Suspense>
    </AppShell>
  );
}
