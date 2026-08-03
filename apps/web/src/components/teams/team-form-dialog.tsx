"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTeamSchema, type CreateTeamInput } from "@nbbl/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeamMutations } from "@/hooks/use-team-mutations";
import type { OrganizationDoc, TeamDoc } from "@/types/firestore";

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
  organizations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: TeamDoc | null;
  organizations: OrganizationDoc[];
}) {
  const { create, update } = useTeamMutations();
  const form = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      organizationId: organizations[0]?.id ?? "org_nbbl_academy",
      ageGroup: "U16",
      division: "Elite Division",
      seasonId: "season_2024_spring",
      status: "active",
      practiceDays: ["Mon", "Wed", "Fri"],
    },
  });

  useEffect(() => {
    if (!open) return;
    if (team) {
      form.reset({
        name: team.name,
        organizationId: team.organizationId,
        ageGroup: team.ageGroup,
        division: team.division,
        seasonId: team.seasonId,
        status: team.status === "deleted" ? "inactive" : team.status,
        practiceDays: team.practiceDays,
        headCoachParticipantId: team.headCoachParticipantId ?? undefined,
      });
    } else {
      form.reset({
        name: "",
        organizationId: organizations[0]?.id ?? "org_nbbl_academy",
        ageGroup: "U16",
        division: "Elite Division",
        seasonId: "season_2024_spring",
        status: "active",
        practiceDays: ["Mon", "Wed", "Fri"],
      });
    }
  }, [open, team, organizations, form]);

  if (!open) return null;

  async function onSubmit(values: CreateTeamInput) {
    if (team) {
      await update.mutateAsync({ ...values, id: team.id });
    } else {
      await create.mutateAsync(values);
    }
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {team ? "Edit team" : "Create team"}
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-sm font-medium">Team name</label>
            <Input {...form.register("name")} />
          </div>
          <div>
            <label className="text-sm font-medium">Organization</label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
              {...form.register("organizationId")}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Age group</label>
              <Input {...form.register("ageGroup")} />
            </div>
            <div>
              <label className="text-sm font-medium">Division</label>
              <Input {...form.register("division")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
