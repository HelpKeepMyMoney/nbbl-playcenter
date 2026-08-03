"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TournamentBracket } from "@/components/tournaments/tournament-bracket";
import { TournamentSchedulePreview } from "@/components/tournaments/tournament-schedule-preview";
import { TournamentStandingsTable } from "@/components/tournaments/tournament-standings-table";
import {
  useTournament,
  useTournamentMatches,
  useTournamentStandings,
} from "@/hooks/use-tournaments";
import { computeTournamentGameCounts } from "@nbbl/shared";
import { cn } from "@/lib/utils";

const TABS = ["overview", "schedule", "standings", "bracket"] as const;
type Tab = (typeof TABS)[number];

export default function CoachTournamentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [tab, setTab] = useState<Tab>("overview");
  const { data: tournament, isLoading } = useTournament(id);
  const { data: matches = [], isError: matchesError, error: matchesQueryError } =
    useTournamentMatches(id);
  const { data: standings = [] } = useTournamentStandings(id);

  if (isLoading) {
    return (
      <AppShell title="Tournament">
        <div className="p-8 text-gray-500">Loading…</div>
      </AppShell>
    );
  }

  if (!tournament) {
    return (
      <AppShell title="Tournament">
        <div className="p-8">
          <p className="text-gray-500">Tournament not found.</p>
          <Link href="/coach/tournaments" className="text-nbbl-red hover:underline">
            Back to tournaments
          </Link>
        </div>
      </AppShell>
    );
  }

  const counts = computeTournamentGameCounts(
    tournament.timesEachTeamPlaysOthers
  );
  const firstMatch = matches[0];
  const lastMatch = matches[matches.length - 1];

  return (
    <AppShell
      title={tournament.title}
      breadcrumb={[
        { label: "Tournaments", href: "/coach/tournaments" },
        { label: tournament.title },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
        <Button variant="outline" size="sm" asChild>
          <Link href="/coach/tournaments">
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{tournament.title}</h1>
          <Badge
            variant={
              tournament.tournamentStatus === "active"
                ? "success"
                : tournament.tournamentStatus === "draft"
                  ? "warning"
                  : "muted"
            }
          >
            {tournament.tournamentStatus}
          </Badge>
        </div>

        <div className="flex gap-1 border-b">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "border-b-2 border-nbbl-red text-nbbl-red"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Total games</p>
                <p className="text-3xl font-bold">{tournament.totalGames}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {counts.rrTotal} round-robin + {counts.playoffTotal} playoffs
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Date & time</p>
                <p className="text-lg font-semibold">
                  {tournament.date} at {tournament.startTime}
                </p>
                {firstMatch && lastMatch && (
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(firstMatch.scheduledStartAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {new Date(lastMatch.scheduledEndAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Format</p>
                <p className="text-lg font-semibold">
                  {tournament.timesEachTeamPlaysOthers}× round-robin
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  7-min games, 10-min slots, {tournament.lunchBreakMinutes}-min
                  lunch after game {tournament.breakAfterGame}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "schedule" && (
          <TournamentSchedulePreview
            tournament={tournament}
            matches={matches}
            isError={matchesError}
            errorMessage={matchesQueryError?.message}
          />
        )}

        {tab === "standings" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <TournamentStandingsTable
              standings={standings}
              division="Boys Division"
            />
            <TournamentStandingsTable
              standings={standings}
              division="Girls Division"
            />
          </div>
        )}

        {tab === "bracket" && (
          <div className="grid gap-8 lg:grid-cols-2">
            <TournamentBracket matches={matches} division="Boys Division" />
            <TournamentBracket matches={matches} division="Girls Division" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
