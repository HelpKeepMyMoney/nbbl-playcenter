"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  IdCard,
  LayoutDashboard,
  Medal,
  MessagesSquare,
  Network,
  PlayCircle,
  ScanLine,
  Settings,
  Shield,
  ShoppingBag,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { useNavItems } from "@/hooks/use-nav-items";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  user: User,
  shield: Shield,
  trophy: Trophy,
  medal: Medal,
  calendar: Calendar,
  network: Network,
  building: Building2,
  "id-card": IdCard,
  "credit-card": CreditCard,
  "messages-square": MessagesSquare,
  "bar-chart-3": BarChart3,
  "scan-line": ScanLine,
  "file-text": FileText,
  settings: Settings,
  "play-circle": PlayCircle,
  "shopping-bag": ShoppingBag,
};

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { navItems } = useNavItems();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col bg-nbbl-sidebar text-white lg:flex">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="NBBL" width={40} height={40} />
          <div>
            <p className="text-sm font-semibold leading-tight">NBBL PlayCenter</p>
            <p className="text-[10px] uppercase tracking-wide text-white/60">
              Basketball Experience Cloud
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-nbbl-red text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nbbl-gold text-sm font-semibold text-black">
            {user?.displayName?.slice(0, 1) ?? "J"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user?.displayName ?? "User"}
            </p>
            <p className="truncate text-xs text-white/60">
              {user?.title ?? "Member"}
            </p>
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-white/50">
          ONE IDENTITY. ONE INFRASTRUCTURE. LIMITLESS POSSIBILITIES.
        </p>
      </div>
    </aside>
  );
}
