"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createParticipantSchema,
  updateParticipantSchema,
  type CreateParticipantInput,
  type UpdateParticipantInput,
} from "@nbbl/shared";
import { callFunction } from "@/lib/callables";

export function useParticipantMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["participants"] });
  };

  const create = useMutation({
    mutationFn: async (input: CreateParticipantInput) => {
      const parsed = createParticipantSchema.parse(input);
      return callFunction<CreateParticipantInput, { id: string }>(
        "createParticipant",
        parsed
      );
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: UpdateParticipantInput) => {
      const parsed = updateParticipantSchema.parse(input);
      return callFunction("updateParticipant", parsed);
    },
    onSuccess: (_, vars) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["participant", vars.id] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      callFunction("softDeleteParticipant", { id }),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
