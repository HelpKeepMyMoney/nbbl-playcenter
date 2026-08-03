"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  computeTournamentGameCounts,
  createTournamentDraftSchema,
  type CreateTournamentDraftInput,
} from "@nbbl/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTournamentMutations } from "@/hooks/use-tournament-mutations";
import type { TournamentDoc } from "@/types/firestore";

export function TournamentEditDialog({
  open,
  onOpenChange,
  tournament,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: TournamentDoc;
}) {
  const router = useRouter();
  const { update } = useTournamentMutations();
  const form = useForm<CreateTournamentDraftInput>({
    resolver: zodResolver(createTournamentDraftSchema),
    defaultValues: {
      title: tournament.title,
      date: tournament.date,
      startTime: tournament.startTime,
      timesEachTeamPlaysOthers: tournament.timesEachTeamPlaysOthers,
      lunchBreakMinutes: tournament.lunchBreakMinutes,
      seasonId: tournament.seasonId,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: tournament.title,
      date: tournament.date,
      startTime: tournament.startTime,
      timesEachTeamPlaysOthers: tournament.timesEachTeamPlaysOthers,
      lunchBreakMinutes: tournament.lunchBreakMinutes,
      seasonId: tournament.seasonId,
    });
  }, [open, tournament, form]);

  if (!open) return null;

  const cycles = form.watch("timesEachTeamPlaysOthers") || 3;
  const counts = computeTournamentGameCounts(cycles);

  async function onSubmit(values: CreateTournamentDraftInput) {
    await update.mutateAsync({
      tournamentId: tournament.id,
      ...values,
    });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold">Edit Tournament</h2>
        <p className="mb-4 text-sm text-gray-500">
          Saving changes will regenerate the full schedule. Existing match
          results may be reset.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
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
                {...form.register("timesEachTeamPlaysOthers", {
                  valueAsNumber: true,
                })}
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
            round-robin + {counts.playoffTotal} playoffs). Lunch break after
            game {counts.breakAfterGame}.
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
