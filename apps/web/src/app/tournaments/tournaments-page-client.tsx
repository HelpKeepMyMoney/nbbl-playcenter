"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentCreateForm } from "@/components/tournaments/tournament-create-form";
import { useTournamentMutations } from "@/hooks/use-tournament-mutations";
import {
  useCanWriteTournaments,
  useTournaments,
} from "@/hooks/use-tournaments";
import { usePermissions } from "@/hooks/use-permissions";
import type { CreateTournamentDraftInput } from "@nbbl/shared";

export default function TournamentsPageClient() {
  const router = useRouter();
  const { data: tournaments = [], isLoading } = useTournaments();
  const canWrite = useCanWriteTournaments();
  const { loading: permissionsLoading } = usePermissions();
  const { createDraft } = useTournamentMutations();
  const [showCreate, setShowCreate] = useState(false);

  async function handleCreate(values: CreateTournamentDraftInput) {
    const result = await createDraft.mutateAsync(values);
    setShowCreate(false);
    router.push(`/tournaments/${result.tournamentId}`);
  }

  return (
    <AppShell title="Tournaments">
      <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tournaments</h1>
            <p className="text-sm text-gray-500">
              Circuit 1 round-robin tournaments with playoff brackets
            </p>
          </div>
          {canWrite && (
            <Button onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-4 w-4" />
              Create Tournament
            </Button>
          )}
          {!permissionsLoading && !canWrite && (
            <p className="text-xs text-gray-400">
              Tournament creation requires league director access.
            </p>
          )}
        </div>

        {showCreate && canWrite && (
          <TournamentCreateForm
            onSubmit={handleCreate}
            loading={createDraft.isPending}
          />
        )}

        {isLoading ? (
          <p className="text-gray-500">Loading tournaments…</p>
        ) : tournaments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No tournaments yet.
              {canWrite && " Create one to generate a full schedule."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
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
