"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  computeTournamentGameCounts,
  createTournamentDraftSchema,
  type CreateTournamentDraftInput,
} from "@nbbl/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TournamentCreateForm({
  onSubmit,
  loading,
}: {
  onSubmit: (values: CreateTournamentDraftInput) => Promise<void>;
  loading?: boolean;
}) {
  const form = useForm<CreateTournamentDraftInput>({
    resolver: zodResolver(createTournamentDraftSchema),
    defaultValues: {
      title: "Circuit 1 Championship",
      date: new Date().toISOString().slice(0, 10),
      startTime: "09:00",
      timesEachTeamPlaysOthers: 3,
      lunchBreakMinutes: 60,
      seasonId: "season_circuit1_2026",
    },
  });

  const cycles = form.watch("timesEachTeamPlaysOthers") || 3;
  const counts = computeTournamentGameCounts(cycles);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Create Tournament</h2>
      <p className="text-sm text-gray-500">
        Uses all 8 Circuit 1 teams (4 boys, 4 girls). Each team plays every
        other team in its division the specified number of times, followed by
        playoffs.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Title</span>
          <Input {...form.register("title")} placeholder="Tournament title" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Date</span>
          <Input type="date" {...form.register("date")} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Start time</span>
          <Input type="time" {...form.register("startTime")} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">
            Times each team plays others
          </span>
          <Input
            type="number"
            min={1}
            max={10}
            {...form.register("timesEachTeamPlaysOthers", { valueAsNumber: true })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Lunch break (minutes)</span>
          <Input
            type="number"
            min={0}
            max={180}
            {...form.register("lunchBreakMinutes", { valueAsNumber: true })}
          />
        </label>
      </div>

      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
        <strong>{counts.totalGames} total games</strong> ({counts.rrTotal}{" "}
        round-robin + {counts.playoffTotal} playoffs). Lunch break after game{" "}
        {counts.breakAfterGame}. Games are 7 minutes with 10-minute slot spacing.
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Generating schedule…" : "Generate Schedule"}
      </Button>
    </form>
  );
}
