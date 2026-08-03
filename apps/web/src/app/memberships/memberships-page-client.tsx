"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { PERMISSIONS } from "@nbbl/shared";
import { AppShell } from "@/components/layout/app-shell";
import {
  CancelMembershipDialog,
  ChangePlanDialog,
} from "@/components/memberships/membership-action-dialogs";
import { MembershipPlanDialog } from "@/components/memberships/membership-plan-dialog";
import {
  formatMembershipStatus,
  membershipStatusBadge,
} from "@/components/memberships/membership-utils";
import { ParticipantAvatar } from "@/components/participants/participant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMembershipMutations } from "@/hooks/use-membership-mutations";
import { usePermissions } from "@/hooks/use-permissions";
import { useParticipants } from "@/hooks/use-participants";
import {
  useMembershipPlans,
  usePlayerMemberships,
} from "@/hooks/use-player-memberships";
import { useTeams } from "@/hooks/use-teams";
import {
  downloadMembershipsCsv,
  formatMembershipDate,
} from "@/lib/export-memberships-csv";
import type { PlayerMembershipDoc } from "@/types/firestore";
import { cn } from "@/lib/utils";

type SortField =
  | "player"
  | "team"
  | "plan"
  | "amount"
  | "status"
  | "effective"
  | "nextBilling";
type SortDirection = "asc" | "desc";

function compareStrings(a: string, b: string, direction: SortDirection): number {
  const cmp = a.localeCompare(b, undefined, { sensitivity: "base" });
  return direction === "asc" ? cmp : -cmp;
}

function compareNumbers(a: number, b: number, direction: SortDirection): number {
  const cmp = a - b;
  return direction === "asc" ? cmp : -cmp;
}

export default function MembershipsPageClient() {
  const { data: memberships = [], isLoading, error } = usePlayerMemberships();
  const { data: plans = [] } = useMembershipPlans();
  const { data: teams = [] } = useTeams();
  const { data: participants = [] } = useParticipants();
  const { pause, resume, toggleAutoRenew } = useMembershipMutations();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.MEMBERSHIPS_WRITE);

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("player");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [changePlanMembership, setChangePlanMembership] =
    useState<PlayerMembershipDoc | null>(null);
  const [cancelMembership, setCancelMembership] =
    useState<PlayerMembershipDoc | null>(null);

  const activePlans = plans.filter((p) => p.status === "active");

  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants]
  );

  const kpis = useMemo(() => {
    const active = memberships.filter((m) => m.status === "active");
    const paused = memberships.filter((m) => m.status === "paused");
    const mrr = active.reduce((sum, m) => sum + m.monthlyAmount, 0);
    return {
      activeCount: active.length,
      mrr,
      pausedCount: paused.length,
      planCount: activePlans.length,
    };
  }, [memberships, activePlans.length]);

  const filtered = useMemo(() => {
    return memberships.filter((m) => {
      if (
        search &&
        !m.participantName.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (teamFilter !== "all" && m.teamId !== teamFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (planFilter !== "all" && m.planId !== planFilter) return false;
      return true;
    });
  }, [memberships, search, teamFilter, statusFilter, planFilter]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      switch (sortField) {
        case "player":
          return compareStrings(a.participantName, b.participantName, sortDirection);
        case "team":
          return compareStrings(a.teamName ?? "", b.teamName ?? "", sortDirection);
        case "plan":
          return compareStrings(a.planName, b.planName, sortDirection);
        case "amount":
          return compareNumbers(a.monthlyAmount, b.monthlyAmount, sortDirection);
        case "status":
          return compareStrings(a.status, b.status, sortDirection);
        case "effective":
          return compareStrings(a.effectiveDate, b.effectiveDate, sortDirection);
        case "nextBilling":
          return compareStrings(
            a.nextBillingDate,
            b.nextBillingDate,
            sortDirection
          );
        default:
          return 0;
      }
    });
    return rows;
  }, [filtered, sortField, sortDirection]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-nbbl-red" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-nbbl-red" />
    );
  }

  return (
    <AppShell title="Memberships">
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Memberships</h2>
            <p className="mt-1 text-sm text-gray-500">
              NIL athlete billing and subscription management
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => downloadMembershipsCsv(sorted)}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            {canWrite && (
              <Button onClick={() => setPlanDialogOpen(true)}>
                <Settings className="h-4 w-4" />
                Manage Plans
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active Memberships", value: String(kpis.activeCount) },
            {
              label: "Monthly Revenue",
              value: `$${kpis.mrr.toLocaleString()}`,
            },
            { label: "Paused", value: String(kpis.pausedCount) },
            { label: "Plans", value: String(kpis.planCount) },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <select
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="all">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="all">All plans</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-sm text-gray-500">Loading memberships...</div>
            ) : error ? (
              <div className="p-6 text-sm text-red-600">
                Failed to load memberships.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => toggleSort("player")}>
                          Player
                          <SortIcon field="player" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => toggleSort("team")}>
                          Team
                          <SortIcon field="team" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => toggleSort("plan")}>
                          Plan
                          <SortIcon field="plan" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => toggleSort("amount")}>
                          Amount
                          <SortIcon field="amount" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => toggleSort("status")}>
                          Status
                          <SortIcon field="status" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => toggleSort("effective")}>
                          Effective
                          <SortIcon field="effective" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSort("nextBilling")}
                        >
                          Next Billing
                          <SortIcon field="nextBilling" />
                        </button>
                      </th>
                      <th className="px-4 py-3">Auto-Renew</th>
                      {canWrite && <th className="px-4 py-3">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr>
                        <td
                          colSpan={canWrite ? 9 : 8}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No memberships match your filters.
                        </td>
                      </tr>
                    ) : (
                      sorted.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/participants/${m.participantId}`}
                              className="flex items-center gap-2 font-medium text-gray-900 hover:text-nbbl-red"
                            >
                              <ParticipantAvatar
                                participant={
                                  participantMap.get(m.participantId) ?? {
                                    id: m.participantId,
                                    firstName:
                                      m.participantName.split(" ")[0] ?? "",
                                    lastName:
                                      m.participantName
                                        .split(" ")
                                        .slice(1)
                                        .join(" ") || "",
                                    avatarUrl: null,
                                  }
                                }
                                size="md"
                              />
                              {m.participantName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {m.teamName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{m.planName}</td>
                          <td className="px-4 py-3 text-gray-900">
                            ${m.monthlyAmount}/mo
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={membershipStatusBadge(m.status)}>
                              {formatMembershipStatus(m.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatMembershipDate(m.effectiveDate)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatMembershipDate(m.nextBillingDate)}
                          </td>
                          <td className="px-4 py-3">
                            {canWrite && m.status !== "cancelled" ? (
                              <button
                                type="button"
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  m.autoRenew
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-600"
                                )}
                                onClick={() =>
                                  toggleAutoRenew.mutate({
                                    membershipId: m.id,
                                    autoRenew: !m.autoRenew,
                                  })
                                }
                              >
                                {m.autoRenew ? "On" : "Off"}
                              </button>
                            ) : (
                              <span className="text-gray-500">
                                {m.autoRenew ? "On" : "Off"}
                              </span>
                            )}
                          </td>
                          {canWrite && (
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {m.status === "active" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        pause.mutate({ membershipId: m.id })
                                      }
                                    >
                                      Pause
                                    </DropdownMenuItem>
                                  )}
                                  {m.status === "paused" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        resume.mutate({ membershipId: m.id })
                                      }
                                    >
                                      Resume
                                    </DropdownMenuItem>
                                  )}
                                  {m.status !== "cancelled" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => setChangePlanMembership(m)}
                                      >
                                        Change Plan
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => setCancelMembership(m)}
                                      >
                                        Cancel
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MembershipPlanDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        plans={plans}
      />
      <ChangePlanDialog
        open={!!changePlanMembership}
        onOpenChange={(open) => !open && setChangePlanMembership(null)}
        membership={changePlanMembership}
        plans={plans}
      />
      <CancelMembershipDialog
        open={!!cancelMembership}
        onOpenChange={(open) => !open && setCancelMembership(null)}
        membership={cancelMembership}
      />
    </AppShell>
  );
}
