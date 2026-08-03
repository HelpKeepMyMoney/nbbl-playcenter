"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ParticipantAvatar } from "@/components/participants/participant-avatar";
import { ParticipantFormDialog } from "@/components/participants/participant-form-dialog";
import {
  useOrganizations,
  useParticipants,
} from "@/hooks/use-participants";
import { useParticipantMutations } from "@/hooks/use-participant-mutations";
import { useAllMemberships, useTeams } from "@/hooks/use-teams";
import type { ParticipantDoc } from "@/types/firestore";
import { cn } from "@/lib/utils";

type SortField = "name" | "type" | "organization" | "team" | "status";
type SortDirection = "asc" | "desc";

function compareStrings(a: string, b: string, direction: SortDirection): number {
  const cmp = a.localeCompare(b, undefined, { sensitivity: "base" });
  return direction === "asc" ? cmp : -cmp;
}

export default function ParticipantsPage() {
  const router = useRouter();
  const { data: participants = [], isLoading, error } = useParticipants();
  const { data: organizations = [] } = useOrganizations();
  const { data: teams = [] } = useTeams();
  const { data: memberships = [] } = useAllMemberships();
  const { remove } = useParticipantMutations();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("player");
  const [teamFilter, setTeamFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ParticipantDoc | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const orgMap = useMemo(
    () => new Map(organizations.map((o) => [o.id, o.name])),
    [organizations]
  );

  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t.name])),
    [teams]
  );

  const teamsByParticipant = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const m of memberships) {
      const existing = map.get(m.participantId) ?? [];
      existing.push({
        id: m.teamId,
        name: teamMap.get(m.teamId) ?? m.teamId,
      });
      map.set(m.participantId, existing);
    }
    for (const [id, items] of map) {
      map.set(
        id,
        items.sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    return map;
  }, [memberships, teamMap]);

  const filtered = participants.filter((p) => {
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (teamFilter !== "all") {
      const pTeams = teamsByParticipant.get(p.id) ?? [];
      if (teamFilter === "none") {
        if (pTeams.length > 0) return false;
      } else if (!pTeams.some((t) => t.id === teamFilter)) {
        return false;
      }
    }
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    );
  });

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      switch (sortField) {
        case "name":
          return compareStrings(
            `${a.firstName} ${a.lastName}`,
            `${b.firstName} ${b.lastName}`,
            sortDirection
          );
        case "type":
          return compareStrings(a.type, b.type, sortDirection);
        case "organization": {
          const orgA = orgMap.get(a.organizationId) ?? a.organizationId;
          const orgB = orgMap.get(b.organizationId) ?? b.organizationId;
          return compareStrings(orgA, orgB, sortDirection);
        }
        case "team": {
          const teamA = teamsByParticipant.get(a.id)?.[0]?.name ?? "";
          const teamB = teamsByParticipant.get(b.id)?.[0]?.name ?? "";
          return compareStrings(teamA, teamB, sortDirection);
        }
        case "status":
          return compareStrings(a.status, b.status, sortDirection);
        default:
          return 0;
      }
    });
    return rows;
  }, [filtered, sortField, sortDirection, orgMap, teamsByParticipant]);

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
            <ArrowUpDown
              className="h-3.5 w-3.5 text-gray-300"
              aria-hidden
            />
          )}
        </button>
      </th>
    );
  }

  return (
    <AppShell title="Participants">
      <div className="space-y-4 p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-md"
              placeholder="Search participants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="player">Players (64)</option>
              <option value="all">All types</option>
              <option value="coach">Coaches</option>
              <option value="staff">Staff</option>
            </select>
            <select
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">All teams</option>
              <option value="none">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add participant
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <SortableHeader field="name" label="Name" />
                <SortableHeader field="type" label="Type" />
                <SortableHeader field="organization" label="Organization" />
                <SortableHeader field="team" label="Teams" />
                <SortableHeader field="status" label="Status" />
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={6}>
                    Loading participants...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-6 text-red-600" colSpan={6}>
                    Failed to load participants.
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={6}>
                    No participants found.
                  </td>
                </tr>
              ) : (
                sorted.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                    onClick={() => router.push(`/participants/${p.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/participants/${p.id}`}
                        className="flex items-center gap-3 hover:text-nbbl-red"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ParticipantAvatar participant={p} size="md" />
                        <span>
                          {p.firstName} {p.lastName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.type}</td>
                    <td className="px-4 py-3">
                      {orgMap.get(p.organizationId) ?? p.organizationId}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const pTeams = teamsByParticipant.get(p.id) ?? [];
                        if (pTeams.length === 0) {
                          return <span className="text-gray-400">—</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-x-1">
                            {pTeams.map((team, i) => (
                              <span key={team.id}>
                                {i > 0 && (
                                  <span className="text-gray-400">, </span>
                                )}
                                <Link
                                  href={`/teams?teamId=${team.id}`}
                                  className="text-nbbl-red hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {team.name}
                                </Link>
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          p.status === "active"
                            ? "success"
                            : p.status === "pending"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(p);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => remove.mutate(p.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ParticipantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        participant={editing}
        organizations={organizations}
      />
    </AppShell>
  );
}
