"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignPlayerMembershipSchema,
  cancelPlayerMembershipSchema,
  changePlayerMembershipPlanSchema,
  createMembershipPlanSchema,
  pausePlayerMembershipSchema,
  resumePlayerMembershipSchema,
  toggleMembershipAutoRenewSchema,
  updateMembershipPlanSchema,
  type AssignPlayerMembershipInput,
  type CancelPlayerMembershipInput,
  type ChangePlayerMembershipPlanInput,
  type CreateMembershipPlanInput,
  type PausePlayerMembershipInput,
  type ResumePlayerMembershipInput,
  type ToggleMembershipAutoRenewInput,
  type UpdateMembershipPlanInput,
} from "@nbbl/shared";
import { callFunction } from "@/lib/callables";

export function useMembershipMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["playerMemberships"] });
    qc.invalidateQueries({ queryKey: ["membershipPlans"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    qc.invalidateQueries({ queryKey: ["participant-membership"] });
  };

  const createPlan = useMutation({
    mutationFn: async (input: CreateMembershipPlanInput) =>
      callFunction("createMembershipPlan", createMembershipPlanSchema.parse(input)),
    onSuccess: invalidate,
  });

  const updatePlan = useMutation({
    mutationFn: async (input: UpdateMembershipPlanInput) =>
      callFunction("updateMembershipPlan", updateMembershipPlanSchema.parse(input)),
    onSuccess: invalidate,
  });

  const assign = useMutation({
    mutationFn: async (input: AssignPlayerMembershipInput) =>
      callFunction("assignPlayerMembership", assignPlayerMembershipSchema.parse(input)),
    onSuccess: invalidate,
  });

  const changePlan = useMutation({
    mutationFn: async (input: ChangePlayerMembershipPlanInput) =>
      callFunction(
        "changePlayerMembershipPlan",
        changePlayerMembershipPlanSchema.parse(input)
      ),
    onSuccess: invalidate,
  });

  const pause = useMutation({
    mutationFn: async (input: PausePlayerMembershipInput) =>
      callFunction("pausePlayerMembership", pausePlayerMembershipSchema.parse(input)),
    onSuccess: invalidate,
  });

  const resume = useMutation({
    mutationFn: async (input: ResumePlayerMembershipInput) =>
      callFunction("resumePlayerMembership", resumePlayerMembershipSchema.parse(input)),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: async (input: CancelPlayerMembershipInput) =>
      callFunction("cancelPlayerMembership", cancelPlayerMembershipSchema.parse(input)),
    onSuccess: invalidate,
  });

  const toggleAutoRenew = useMutation({
    mutationFn: async (input: ToggleMembershipAutoRenewInput) =>
      callFunction(
        "toggleMembershipAutoRenew",
        toggleMembershipAutoRenewSchema.parse(input)
      ),
    onSuccess: invalidate,
  });

  return {
    createPlan,
    updatePlan,
    assign,
    changePlan,
    pause,
    resume,
    cancel,
    toggleAutoRenew,
  };
}
