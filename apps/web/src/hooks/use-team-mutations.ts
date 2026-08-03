"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addTeamMemberSchema,
  createTeamSchema,
  updateTeamSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
} from "@nbbl/shared";
import { callFunction } from "@/lib/callables";

export function useTeamMutations() {
  const qc = useQueryClient();

  const invalidateTeams = () => {
    qc.invalidateQueries({ queryKey: ["teams"] });
    qc.invalidateQueries({ queryKey: ["team-stats"] });
  };

  const create = useMutation({
    mutationFn: async (input: CreateTeamInput) =>
      callFunction("createTeam", createTeamSchema.parse(input)),
    onSuccess: invalidateTeams,
  });

  const update = useMutation({
    mutationFn: async (input: UpdateTeamInput) =>
      callFunction("updateTeam", updateTeamSchema.parse(input)),
    onSuccess: (_, vars) => {
      invalidateTeams();
      qc.invalidateQueries({ queryKey: ["team", vars.id] });
    },
  });

  const addMember = useMutation({
    mutationFn: async (input: {
      teamId: string;
      participantId: string;
      role?: "player" | "coach" | "manager";
    }) => callFunction("addTeamMember", addTeamMemberSchema.parse(input)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["memberships", vars.teamId] });
      qc.invalidateQueries({ queryKey: ["team", vars.teamId] });
      invalidateTeams();
    },
  });

  const removeMember = useMutation({
    mutationFn: async (input: { teamId: string; membershipId: string }) =>
      callFunction("removeTeamMember", input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["memberships", vars.teamId] });
      qc.invalidateQueries({ queryKey: ["team", vars.teamId] });
      invalidateTeams();
    },
  });

  return { create, update, addMember, removeMember };
}
