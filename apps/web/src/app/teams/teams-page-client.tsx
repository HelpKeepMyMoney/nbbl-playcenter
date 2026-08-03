"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamDetailModal } from "@/components/teams/team-detail-modal";
import { TeamFormDialog } from "@/components/teams/team-form-dialog";
import { useOrganizations } from "@/hooks/use-participants";
import { useTeamStats, useTeams } from "@/hooks/use-teams";
import {
  calcPercentChange,
  formatPercentChange,
} from "@/lib/percent-change";
import type { TeamDoc } from "@/types/firestore";
import { cn } from "@/lib/utils";

const CIRCUIT1_SEASON_ID = "season_circuit1_2026";

type SortField =
  | "name"
  | "organization"
  | "ageGroup"
  | "division"
  | "headCoach"
  | "players"
  | "status";
type SortDirection = "asc" | "desc";

function compareStrings(a: string, b: string, direction: SortDirection): number {
  const cmp = a.localeCompare(b, undefined, { sensitivity: "base" });
  return direction === "asc" ? cmp : -cmp;
}

function compareNumbers(a: number, b: number, direction: SortDirection): number {
  const cmp = a - b;
  return direction === "asc" ? cmp : -cmp;
}

function statusBadge(status: TeamDoc["status"]) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "pending") return <Badge variant="warning">Pending</Badge>;
  return <Badge variant="muted">Inactive</Badge>;
}

export default function TeamsPageClient() {
  const { data: teams = [], isLoading } = useTeams();
  const { data: stats } = useTeamStats();
  const { data: organizations = [] } = useOrganizations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get("teamId");
  const [orgFilter, setOrgFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [coachFilter, setCoachFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const orgMap = useMemo(
    () => new Map(organizations.map((o) => [o.id, o.name])),
    [organizations]
  );

  const ageGroupOptions = useMemo(
    () =>
      [...new Set(teams.map((team) => team.ageGroup).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [teams]
  );

  const divisionOptions = useMemo(
    () =>
      [...new Set(teams.map((team) => team.division).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [teams]
  );

  const seasonOptions = useMemo(
    () =>
      [...new Set(teams.map((team) => team.seasonId).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [teams]
  );

  const coachOptions = useMemo(() => {
    const coaches = new Map<string, string>();
    for (const team of teams) {
      if (team.headCoachParticipantId && team.headCoachName) {
        coaches.set(team.headCoachParticipantId, team.headCoachName);
      }
    }
    return [...coaches.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const facilityOptions = useMemo(
    () =>
      [
        ...new Set(
          teams.map((team) => team.homeFacilityName).filter(Boolean) as string[]
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [teams]
  );

  const extraFilterCount = [
    statusFilter,
    seasonFilter,
    coachFilter,
    facilityFilter,
  ].filter((value) => value !== "all").length;

  const filtered = teams.filter((team) => {
    if (orgFilter !== "all" && team.organizationId !== orgFilter) return false;
    if (ageFilter !== "all" && team.ageGroup !== ageFilter) return false;
    if (divisionFilter !== "all" && team.division !== divisionFilter)
      return false;
    if (statusFilter !== "all" && team.status !== statusFilter) return false;
    if (seasonFilter !== "all" && team.seasonId !== seasonFilter) return false;
    if (
      coachFilter !== "all" &&
      team.headCoachParticipantId !== coachFilter
    ) {
      return false;
    }
    if (
      facilityFilter !== "all" &&
      team.homeFacilityName !== facilityFilter
    ) {
      return false;
    }
    return true;
  });

  function clearExtraFilters() {
    setStatusFilter("all");
    setSeasonFilter("all");
    setCoachFilter("all");
    setFacilityFilter("all");
  }

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      switch (sortField) {
        case "name":
          return compareStrings(a.name, b.name, sortDirection);
        case "organization": {
          const orgA = orgMap.get(a.organizationId) ?? a.organizationId;
          const orgB = orgMap.get(b.organizationId) ?? b.organizationId;
          return compareStrings(orgA, orgB, sortDirection);
        }
        case "ageGroup":
          return compareStrings(a.ageGroup, b.ageGroup, sortDirection);
        case "division":
          return compareStrings(a.division, b.division, sortDirection);
        case "headCoach":
          return compareStrings(
            a.headCoachName ?? "",
            b.headCoachName ?? "",
            sortDirection
          );
        case "players":
          return compareNumbers(a.playerCount, b.playerCount, sortDirection);
        case "status":
          return compareStrings(a.status, b.status, sortDirection);
        default:
          return 0;
      }
    });
    return rows;
  }, [filtered, sortField, sortDirection, orgMap]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function SortableHeader({
    field,
    label,
    className,
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) {
    const active = sortField === field;
    return (
      <th
        className={cn("px-4 py-3 font-medium", className)}
        aria-sort={
          active
            ? sortDirection === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md transition-colors hover:text-gray-900",
            active ? "text-gray-900" : "text-gray-500"
          )}
        >
          {label}
          {active ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" aria-hidden />
          )}
        </button>
      </th>
    );
  }

  const selected = selectedId
    ? (teams.find((t) => t.id === selectedId) ?? null)
    : null;

  function selectTeam(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("teamId", id);
    router.replace(`/teams?${params.toString()}`);
  }

  function closeTeam() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("teamId");
    const query = params.toString();
    router.replace(query ? `/teams?${query}` : "/teams");
  }

  const currentMetrics = useMemo(() => {
    const headCoachIds = new Set<string>();
    let activeTeams = 0;
    let teamsThisSeason = 0;

    for (const team of teams) {
      if (team.status === "active") activeTeams += 1;
      if (team.seasonId === CIRCUIT1_SEASON_ID) teamsThisSeason += 1;
      if (team.headCoachParticipantId) {
        headCoachIds.add(team.headCoachParticipantId);
      }
    }

    return {
      totalTeams: teams.length,
      activeTeams,
      teamsThisSeason,
      totalCoaches: headCoachIds.size,
    };
  }, [teams]);

  const kpi = useMemo(() => {
    const previous = {
      totalTeams:
        stats?.previousTotalTeams ??
        stats?.totalTeams ??
        currentMetrics.totalTeams,
      activeTeams:
        stats?.previousActiveTeams ??
        stats?.activeTeams ??
        currentMetrics.activeTeams,
      teamsThisSeason:
        stats?.previousTeamsThisSeason ??
        stats?.teamsThisSeason ??
        currentMetrics.teamsThisSeason,
      totalCoaches:
        stats?.previousTotalCoaches ??
        stats?.totalCoaches ??
        currentMetrics.totalCoaches,
    };

    const items = [
      {
        label: "Total Teams",
        value: currentMetrics.totalTeams,
        current: currentMetrics.totalTeams,
        previous: previous.totalTeams,
      },
      {
        label: "Active Teams",
        value: currentMetrics.activeTeams,
        current: currentMetrics.activeTeams,
        previous: previous.activeTeams,
      },
      {
        label: "Teams This Season",
        value: currentMetrics.teamsThisSeason,
        current: currentMetrics.teamsThisSeason,
        previous: previous.teamsThisSeason,
      },
      {
        label: "Total Coaches",
        value: currentMetrics.totalCoaches,
        current: currentMetrics.totalCoaches,
        previous: previous.totalCoaches,
      },
    ];

    return items.map((item) => {
      const change = calcPercentChange(item.current, item.previous);
      return {
        ...item,
        delta: formatPercentChange(item.current, item.previous),
        trendUp: change === null ? true : change >= 0,
      };
    });
  }, [currentMetrics, stats]);

  return (
    <AppShell title="Teams">
      <div className="min-h-[calc(100vh-4rem)] overflow-auto p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            >
              <option value="all">All Organizations</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
            >
              <option value="all">All Age Groups</option>
              {ageGroupOptions.map((ageGroup) => (
                <option key={ageGroup} value={ageGroup}>
                  {ageGroup}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
            >
              <option value="all">All Divisions</option>
              {divisionOptions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>
            <Button
              variant={
                moreFiltersOpen || extraFilterCount > 0 ? "default" : "secondary"
              }
              size="sm"
              onClick={() => setMoreFiltersOpen((open) => !open)}
            >
              More Filters
              {extraFilterCount > 0 ? ` (${extraFilterCount})` : ""}
            </Button>
            <Button
              className="ml-auto"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New team
            </Button>
          </div>

          {moreFiltersOpen ? (
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Status
                <select
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Season
                <select
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                >
                  <option value="all">All Seasons</option>
                  {seasonOptions.map((seasonId) => (
                    <option key={seasonId} value={seasonId}>
                      {seasonId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Head Coach
                <select
                  className="h-9 min-w-[10rem] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  value={coachFilter}
                  onChange={(e) => setCoachFilter(e.target.value)}
                >
                  <option value="all">All Coaches</option>
                  {coachOptions.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Facility
                <select
                  className="h-9 min-w-[12rem] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  value={facilityFilter}
                  onChange={(e) => setFacilityFilter(e.target.value)}
                >
                  <option value="all">All Facilities</option>
                  {facilityOptions.map((facility) => (
                    <option key={facility} value={facility}>
                      {facility}
                    </option>
                  ))}
                </select>
              </label>
              {extraFilterCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-0.5"
                  onClick={clearExtraFilters}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpi.map((item) => (
              <Card key={item.label}>
                <CardHeader>
                  <CardTitle>{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-semibold">{item.value}</p>
                    <span
                      className={cn(
                        "flex items-center text-xs",
                        item.trendUp ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {item.trendUp ? (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      ) : (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      )}
                      {item.delta}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <SortableHeader field="name" label="Team Name" />
                  <SortableHeader field="organization" label="Organization" />
                  <SortableHeader field="ageGroup" label="Age Group" />
                  <SortableHeader field="division" label="Division" />
                  <SortableHeader field="headCoach" label="Head Coach" />
                  <SortableHeader field="players" label="Players" />
                  <SortableHeader field="status" label="Status" />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-gray-500">
                      Loading teams...
                    </td>
                  </tr>
                ) : (
                  sorted.map((team) => {
                    const active = selectedId === team.id;
                    return (
                      <tr
                        key={team.id}
                        onClick={() => selectTeam(team.id)}
                        className={`cursor-pointer border-t border-gray-100 ${
                          active ? "bg-amber-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium">{team.name}</td>
                        <td className="px-4 py-3">
                          {orgMap.get(team.organizationId) ??
                            team.organizationId}
                        </td>
                        <td className="px-4 py-3">{team.ageGroup}</td>
                        <td className="px-4 py-3">{team.division}</td>
                        <td className="px-4 py-3">
                          {team.headCoachName ?? "—"}
                        </td>
                        <td className="px-4 py-3">{team.playerCount}</td>
                        <td className="px-4 py-3">
                          {statusBadge(team.status)}
                        </td>
                        <td className="px-4 py-3">
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
              Showing 1 to {Math.min(filtered.length, 8)} of {filtered.length}{" "}
              teams
            </div>
          </div>
      </div>

      {selected ? (
        <TeamDetailModal
          team={selected}
          orgName={orgMap.get(selected.organizationId)}
          open
          onClose={closeTeam}
          getPlayerProfileHref={(id) => `/participants/${id}`}
        />
      ) : null}

      <TeamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizations={organizations}
      />
    </AppShell>
  );
}
