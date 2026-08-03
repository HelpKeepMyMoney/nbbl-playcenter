"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TournamentEditDialog } from "@/components/tournaments/tournament-edit-dialog";
import { useTournamentMutations } from "@/hooks/use-tournament-mutations";
import type { TournamentDoc } from "@/types/firestore";

export function TournamentActionsBar({
  tournament,
}: {
  tournament: TournamentDoc;
}) {
  const router = useRouter();
  const { save, recalculate, remove, simulate } = useTournamentMutations();
  const [seedSynced, setSeedSynced] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isDraft = tournament.tournamentStatus === "draft";
  const busy =
    save.isPending ||
    recalculate.isPending ||
    remove.isPending ||
    simulate.isPending;

  async function handleSave() {
    const result = await save.mutateAsync(tournament.id) as {
      seedSynced?: boolean;
    };
    setSeedSynced(!!result?.seedSynced);
    router.refresh();
  }

  async function handleRecalculate() {
    await recalculate.mutateAsync(tournament.id);
    router.refresh();
  }

  async function handleSimulate() {
    if (
      !confirm(
        "This will simulate all round-robin games, update standings, and refresh player and team statistics. Playoff matchups will remain as seed placeholders until those games are played."
      )
    ) {
      return;
    }
    const result = (await simulate.mutateAsync(tournament.id)) as {
      seedSynced?: boolean;
    };
    setSeedSynced(!!result?.seedSynced);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this tournament and all its matches?")) return;
    await remove.mutateAsync(tournament.id);
    router.push("/tournaments");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
      <span className="text-sm text-gray-500">
        Status:{" "}
        <strong className="capitalize text-gray-900">
          {tournament.tournamentStatus}
        </strong>
      </span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setEditOpen(true)} disabled={busy}>
          Edit
        </Button>
        {isDraft && (
          <Button onClick={handleSave} disabled={busy}>
            {save.isPending ? "Saving…" : "Save Tournament"}
          </Button>
        )}
        <Button variant="outline" onClick={handleRecalculate} disabled={busy}>
          {recalculate.isPending ? "Recalculating…" : "Recalculate Schedule"}
        </Button>
        <Button onClick={handleSimulate} disabled={busy}>
          {simulate.isPending ? "Simulating…" : "Simulate Tournament"}
        </Button>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={busy}
          className="text-red-600 hover:text-red-700"
        >
          {remove.isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
      {seedSynced && (
        <p className="w-full text-xs text-green-600">
          Seed files updated with tournament, player, and team statistics.
        </p>
      )}
      <TournamentEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tournament={tournament}
      />
    </div>
  );
}
