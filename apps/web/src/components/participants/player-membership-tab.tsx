"use client";

import { useState } from "react";
import { PERMISSIONS } from "@nbbl/shared";
import {
  CancelMembershipDialog,
  ChangePlanDialog,
} from "@/components/memberships/membership-action-dialogs";
import {
  formatMembershipStatus,
  membershipStatusBadge,
} from "@/components/memberships/membership-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembershipMutations } from "@/hooks/use-membership-mutations";
import { usePermissions } from "@/hooks/use-permissions";
import { useMembershipPlans } from "@/hooks/use-player-memberships";
import { formatMembershipDate } from "@/lib/export-memberships-csv";
import type { ParticipantDoc, PlayerMembershipDoc } from "@/types/firestore";
import { cn } from "@/lib/utils";

export function PlayerMembershipTab({
  participant,
  membership,
}: {
  participant: ParticipantDoc;
  membership: PlayerMembershipDoc | null | undefined;
}) {
  const { data: plans = [] } = useMembershipPlans();
  const { pause, resume, toggleAutoRenew, assign } = useMembershipMutations();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.MEMBERSHIPS_WRITE);

  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  const activePlans = plans.filter((p) => p.status === "active");

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignPlanId) return;
    await assign.mutateAsync({
      participantId: participant.id,
      planId: assignPlanId,
      effectiveDate: "2026-08-01",
    });
    setShowAssign(false);
    setAssignPlanId("");
  }

  if (!membership) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-gray-500">No membership on file.</p>
          {canWrite && (
            <div className="mt-4">
              {!showAssign ? (
                <Button onClick={() => setShowAssign(true)}>
                  Assign Membership
                </Button>
              ) : (
                <form
                  onSubmit={handleAssign}
                  className="mx-auto flex max-w-sm flex-col gap-2"
                >
                  <select
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                    value={assignPlanId}
                    onChange={(e) => setAssignPlanId(e.target.value)}
                    required
                  >
                    <option value="">Select a plan</option>
                    {activePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — ${plan.monthlyAmount}/mo
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-center gap-2">
                    <Button type="submit" disabled={assign.isPending}>
                      {assign.isPending ? "Assigning..." : "Assign"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAssign(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Membership Details</CardTitle>
          <Badge variant={membershipStatusBadge(membership.status)}>
            {formatMembershipStatus(membership.status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Plan</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {membership.planName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Monthly Amount
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                ${membership.monthlyAmount}/mo
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Effective Date
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatMembershipDate(membership.effectiveDate)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Next Billing Date
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatMembershipDate(membership.nextBillingDate)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Team</p>
              <p className="mt-1 text-sm text-gray-900">
                {membership.teamName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Auto-Renew
              </p>
              {canWrite && membership.status !== "cancelled" ? (
                <button
                  type="button"
                  className={cn(
                    "mt-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    membership.autoRenew
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                  onClick={() =>
                    toggleAutoRenew.mutate({
                      membershipId: membership.id,
                      autoRenew: !membership.autoRenew,
                    })
                  }
                >
                  {membership.autoRenew ? "On" : "Off"}
                </button>
              ) : (
                <p className="mt-1 text-sm text-gray-900">
                  {membership.autoRenew ? "On" : "Off"}
                </p>
              )}
            </div>
          </div>

          {membership.cancelReason && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <span className="font-medium">Cancellation reason:</span>{" "}
              {membership.cancelReason}
            </div>
          )}

          {canWrite && membership.status !== "cancelled" && (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {membership.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pause.mutate({ membershipId: membership.id })}
                  disabled={pause.isPending}
                >
                  Pause
                </Button>
              )}
              {membership.status === "paused" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    resume.mutate({ membershipId: membership.id })
                  }
                  disabled={resume.isPending}
                >
                  Resume
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChangePlanOpen(true)}
              >
                Change Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelOpen(true)}
              >
                Cancel Membership
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ChangePlanDialog
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
        membership={membership}
        plans={plans}
      />
      <CancelMembershipDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        membership={membership}
      />
    </>
  );
}
