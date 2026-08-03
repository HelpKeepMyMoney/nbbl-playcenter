"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createParticipantSchema,
  type CreateParticipantInput,
} from "@nbbl/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParticipantMutations } from "@/hooks/use-participant-mutations";
import type { OrganizationDoc, ParticipantDoc } from "@/types/firestore";

export function ParticipantFormDialog({
  open,
  onOpenChange,
  participant,
  organizations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: ParticipantDoc | null;
  organizations: OrganizationDoc[];
}) {
  const { create, update } = useParticipantMutations();
  const form = useForm<CreateParticipantInput>({
    resolver: zodResolver(createParticipantSchema),
    defaultValues: {
      type: "player",
      firstName: "",
      lastName: "",
      email: "",
      organizationId: organizations[0]?.id ?? "org_nbbl_academy",
      tags: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    if (participant) {
      form.reset({
        type: participant.type as CreateParticipantInput["type"],
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email ?? "",
        organizationId: participant.organizationId,
        tags: [],
      });
    } else {
      form.reset({
        type: "player",
        firstName: "",
        lastName: "",
        email: "",
        organizationId: organizations[0]?.id ?? "org_nbbl_academy",
        tags: [],
      });
    }
  }, [open, participant, organizations, form]);

  if (!open) return null;

  async function onSubmit(values: CreateParticipantInput) {
    if (participant) {
      await update.mutateAsync({ ...values, id: participant.id });
    } else {
      await create.mutateAsync(values);
    }
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {participant ? "Edit participant" : "Add participant"}
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">First name</label>
              <Input {...form.register("firstName")} />
            </div>
            <div>
              <label className="text-sm font-medium">Last name</label>
              <Input {...form.register("lastName")} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
              {...form.register("type")}
            >
              <option value="player">Player</option>
              <option value="coach">Coach</option>
              <option value="parent">Parent</option>
              <option value="official">Official</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" {...form.register("email")} />
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
