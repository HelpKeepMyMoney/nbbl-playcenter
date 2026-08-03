"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMembershipMutations } from "@/hooks/use-membership-mutations";
import type { MembershipPlanDoc } from "@/types/firestore";

export function MembershipPlanDialog({
  open,
  onOpenChange,
  plans,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: MembershipPlanDoc[];
}) {
  const { createPlan, updatePlan } = useMembershipMutations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("125");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createPlan.mutateAsync({
      name,
      description: description || undefined,
      monthlyAmount: Number(monthlyAmount),
      currency: "USD",
    });
    setName("");
    setDescription("");
    setMonthlyAmount("125");
  }

  function startEdit(plan: MembershipPlanDoc) {
    setEditingId(plan.id);
    setEditName(plan.name);
    setEditAmount(String(plan.monthlyAmount));
    setEditDescription(plan.description ?? "");
  }

  async function handleSaveEdit(planId: string) {
    await updatePlan.mutateAsync({
      id: planId,
      name: editName,
      monthlyAmount: Number(editAmount),
      description: editDescription || null,
    });
    setEditingId(null);
  }

  async function handleArchive(planId: string) {
    await updatePlan.mutateAsync({ id: planId, status: "archived" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Manage Membership Plans</h2>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900">Create New Plan</h3>
          <Input
            placeholder="Plan name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            type="number"
            min="1"
            step="0.01"
            placeholder="Monthly amount"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            required
          />
          <Button type="submit" disabled={createPlan.isPending}>
            {createPlan.isPending ? "Creating..." : "Create Plan"}
          </Button>
        </form>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Existing Plans</h3>
          {plans.length === 0 ? (
            <p className="text-sm text-gray-500">No plans yet.</p>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                {editingId === plan.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                    />
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(plan.id)}
                        disabled={updatePlan.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{plan.name}</p>
                      {plan.description && (
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-700">
                        ${plan.monthlyAmount}/mo · {plan.status}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(plan)}
                      >
                        Edit
                      </Button>
                      {plan.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(plan.id)}
                          disabled={updatePlan.isPending}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
