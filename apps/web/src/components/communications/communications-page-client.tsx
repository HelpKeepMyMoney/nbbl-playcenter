"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { AppShell } from "@/components/layout/app-shell";
import { RoleInboxList } from "@/components/layout/role-inbox-page";
import {
  ADMIN_MESSAGE_PREVIEW,
  ADMIN_NOTIFICATION_PREVIEW,
} from "@/lib/admin-header-content";
import { cn } from "@/lib/utils";

const TAB_ITEMS = [
  {
    id: "notifications",
    label: "Notifications",
    description:
      "Registration alerts, waiver reviews, schedule changes, and league updates",
    count: ADMIN_NOTIFICATION_PREVIEW.length,
  },
  {
    id: "messages",
    label: "Messages",
    description: "Messages from coaches, parents, facility staff, and NBBL admin",
    count: ADMIN_MESSAGE_PREVIEW.length,
  },
] as const;

type CommunicationsTab = (typeof TAB_ITEMS)[number]["id"];

function isValidTab(value: string | null): value is CommunicationsTab {
  return value === "notifications" || value === "messages";
}

export default function CommunicationsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: CommunicationsTab = isValidTab(tabParam)
    ? tabParam
    : "notifications";

  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/communications?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <AppShell title="Communications">
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
          <p className="text-sm text-gray-500">
            League notifications and direct messages in one place
          </p>
        </div>

        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <Tabs.List className="flex gap-1 overflow-x-auto border-b border-gray-200">
            {TAB_ITEMS.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "relative shrink-0 px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors",
                  "hover:text-gray-900",
                  "data-[state=active]:text-gray-900",
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-nbbl-red after:opacity-0 after:transition-opacity",
                  "data-[state=active]:after:opacity-100"
                )}
              >
                {tab.label}
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {tab.count}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="notifications" className="outline-none">
            <p className="mb-4 text-sm text-gray-500">
              {TAB_ITEMS[0].description}
            </p>
            <RoleInboxList
              items={ADMIN_NOTIFICATION_PREVIEW}
              variant="notifications"
            />
          </Tabs.Content>

          <Tabs.Content value="messages" className="outline-none">
            <p className="mb-4 text-sm text-gray-500">
              {TAB_ITEMS[1].description}
            </p>
            <RoleInboxList items={ADMIN_MESSAGE_PREVIEW} variant="messages" />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </AppShell>
  );
}
