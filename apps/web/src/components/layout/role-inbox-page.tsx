"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import type {
  MessagePreviewItem,
  NotificationPreviewItem,
} from "@/lib/role-header-types";

export function RoleInboxList({
  items,
  variant,
}: {
  items: readonly NotificationPreviewItem[] | readonly MessagePreviewItem[];
  variant: "notifications" | "messages";
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">
                  {variant === "notifications"
                    ? (item as NotificationPreviewItem).title
                    : (item as MessagePreviewItem).from}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {variant === "notifications"
                    ? (item as NotificationPreviewItem).body
                    : (item as MessagePreviewItem).preview}
                </p>
              </div>
              <span className="shrink-0 text-xs text-gray-400">
                {item.time}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RoleInboxPage({
  title,
  description,
  items,
  variant,
}: {
  title: string;
  description: string;
  items: readonly NotificationPreviewItem[] | readonly MessagePreviewItem[];
  variant: "notifications" | "messages";
}) {
  return (
    <AppShell title={title}>
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <RoleInboxList items={items} variant={variant} />
      </div>
    </AppShell>
  );
}
