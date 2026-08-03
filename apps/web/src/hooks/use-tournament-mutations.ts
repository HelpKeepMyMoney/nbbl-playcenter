"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTournamentDraftSchema,
  tournamentIdSchema,
  updateTournamentSchema,
  type CreateTournamentDraftInput,
  type UpdateTournamentInput,
} from "@nbbl/shared";
import { callFunction } from "@/lib/callables";

export function useTournamentMutations() {
  const qc = useQueryClient();

  const invalidate = (tournamentId?: string) => {
    qc.invalidateQueries({ queryKey: ["tournaments"] });
    if (tournamentId) {
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      qc.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
      qc.invalidateQueries({
        queryKey: ["tournament-standings", tournamentId],
      });
    }
    qc.invalidateQueries({ queryKey: ["tournament-schedules-by-date"] });
  };

  const createDraft = useMutation({
    mutationFn: async (input: CreateTournamentDraftInput) =>
      callFunction<
        CreateTournamentDraftInput,
        { tournamentId: string; totalGames: number; breakAfterGame: number }
      >("createTournamentDraft", createTournamentDraftSchema.parse(input)),
    onSuccess: (data) => invalidate(data.tournamentId),
  });

  const save = useMutation({
    mutationFn: async (tournamentId: string) =>
      callFunction("saveTournament", tournamentIdSchema.parse({ tournamentId })),
    onSuccess: (_, tournamentId) => invalidate(tournamentId),
  });

  const recalculate = useMutation({
    mutationFn: async (tournamentId: string) =>
      callFunction("recalculateTournamentSchedule", tournamentIdSchema.parse({ tournamentId })),
    onSuccess: (_, tournamentId) => invalidate(tournamentId),
  });

  const update = useMutation({
    mutationFn: async (input: UpdateTournamentInput) =>
      callFunction<
        UpdateTournamentInput,
        { tournamentId: string; totalGames: number; breakAfterGame: number }
      >("updateTournament", updateTournamentSchema.parse(input)),
    onSuccess: (data) => invalidate(data.tournamentId),
  });

  const remove = useMutation({
    mutationFn: async (tournamentId: string) =>
      callFunction("deleteTournament", tournamentIdSchema.parse({ tournamentId })),
    onSuccess: (_, tournamentId) => {
      invalidate(tournamentId);
      qc.invalidateQueries({ queryKey: ["participants"] });
      qc.invalidateQueries({ queryKey: ["participant"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team-tournament-matches"] });
    },
  });

  const simulate = useMutation({
    mutationFn: async (tournamentId: string) =>
      callFunction("simulateTournament", tournamentIdSchema.parse({ tournamentId })),
    onSuccess: (_, tournamentId) => {
      invalidate(tournamentId);
      qc.invalidateQueries({ queryKey: ["participants"] });
      qc.invalidateQueries({ queryKey: ["participant"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team-tournament-matches"] });
    },
  });

  return { createDraft, save, recalculate, update, remove, simulate };
}
