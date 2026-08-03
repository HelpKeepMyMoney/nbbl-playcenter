"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Home,
  MessageCircle,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { useNavItems } from "@/hooks/use-nav-items";
import { cn } from "@/lib/utils";

const mobileIconMap = {
  home: Home,
  calendar: Calendar,
  users: Users,
  message: MessageCircle,
  more: MoreHorizontal,
};

export function MobileTabBar() {
  const pathname = usePathname();
  const { mobileTabs } = useNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black px-2 py-2 lg:hidden">
      <ul className="grid grid-cols-5 gap-1">
        {mobileTabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = mobileIconMap[tab.icon];
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px]",
                  active ? "text-nbbl-red" : "text-white/70"
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
                {tab.badge ? (
                  <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-nbbl-red px-1 text-[9px] text-white">
                    {tab.badge}
                  </span>
                ) : null}
                {active ? (
                  <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-nbbl-red" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
