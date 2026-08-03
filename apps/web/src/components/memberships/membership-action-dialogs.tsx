"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMembershipMutations } from "@/hooks/use-membership-mutations";
import type { MembershipPlanDoc, PlayerMembershipDoc } from "@/types/firestore";

export function ChangePlanDialog({
  open,
  onOpenChange,
  membership,
  plans,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: PlayerMembershipDoc | null;
  plans: MembershipPlanDoc[];
}) {
  const { changePlan } = useMembershipMutations();
  const [planId, setPlanId] = useState("");

  if (!open || !membership) return null;

  const activePlans = plans.filter((p) => p.status === "active");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) return;
    await changePlan.mutateAsync({ membershipId: membership!.id, planId });
    onOpenChange(false);
    setPlanId("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">Change Plan</h2>
        <p className="mb-4 text-sm text-gray-500">
          Change plan for {membership.participantName}. New rate applies on next
          billing cycle.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            required
          >
            <option value="">Select a plan</option>
            {activePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — ${plan.monthlyAmount}/mo
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={changePlan.isPending}>
              {changePlan.isPending ? "Saving..." : "Change Plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CancelMembershipDialog({
  open,
  onOpenChange,
  membership,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: PlayerMembershipDoc | null;
}) {
  const { cancel } = useMembershipMutations();
  const [reason, setReason] = useState("");

  if (!open || !membership) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await cancel.mutateAsync({
      membershipId: membership!.id,
      cancelReason: reason || undefined,
    });
    onOpenChange(false);
    setReason("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">Cancel Membership</h2>
        <p className="mb-4 text-sm text-gray-500">
          Cancel membership for {membership.participantName}? This will remove
          them from monthly revenue.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Keep Membership
            </Button>
            <Button
              type="submit"
              disabled={cancel.isPending}
            >
              {cancel.isPending ? "Cancelling..." : "Cancel Membership"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
