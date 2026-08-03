"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournaments } from "@/hooks/use-tournaments";

export default function CoachTournamentsPage() {
  const { data: tournaments = [], isLoading } = useTournaments();

  return (
    <AppShell title="Tournaments">
      <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-sm text-gray-500">
            Circuit 1 round-robin tournaments with playoff brackets
          </p>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading tournaments…</p>
        ) : tournaments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No tournaments yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/coach/tournaments/${t.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{t.title}</CardTitle>
                      <Badge
                        variant={
                          t.tournamentStatus === "active"
                            ? "success"
                            : t.tournamentStatus === "draft"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {t.tournamentStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-gray-500">
                    <p>
                      {t.date} · Starts {t.startTime}
                    </p>
                    <p>
                      {t.totalGames} games · {t.timesEachTeamPlaysOthers}×
                      round-robin
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
