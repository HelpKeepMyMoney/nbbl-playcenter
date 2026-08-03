"use client";

import Link from "next/link";
import { Bell, ChevronDown, LogOut, Mail, Menu, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { getRoleBasePath } from "@/lib/user-role";
import { getRoleHeaderContent } from "@/lib/role-header-content";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = { label: string; href?: string };

export function AppHeader({
  title,
  breadcrumb,
  showDesktopMenu = false,
}: {
  title: string;
  breadcrumb?: BreadcrumbItem[];
  showDesktopMenu?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const roleBase = getRoleBasePath(user);
  const headerContent = getRoleHeaderContent(user);
  const profileHref = roleBase ? `${roleBase}/profile` : "/administration";
  const profileLabel = roleBase ? "My Profile" : "Administration";

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "text-gray-700",
          showDesktopMenu ? "flex" : "lg:hidden"
        )}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm"
          aria-label="Breadcrumb"
        >
          {breadcrumb.map((item, i) => (
            <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span className="text-gray-400" aria-hidden>
                  ›
                </span>
              ) : null}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-900"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="truncate font-semibold text-gray-900">
                  {item.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      ) : showDesktopMenu ? null : (
        <h1 className="text-lg font-semibold text-gray-900 lg:text-xl">
          {title}
        </h1>
      )}
      <div className="mx-auto hidden max-w-xl flex-1 lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-10"
            placeholder={headerContent.searchPlaceholder}
          />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-600"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-nbbl-red text-[10px] text-white">
                {headerContent.notificationCount}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {headerContent.notifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="flex-col items-start gap-0.5 py-2"
              >
                <span className="font-medium text-gray-900">{item.title}</span>
                <span className="text-xs text-gray-500">{item.body}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={headerContent.notificationsHref}
                className="justify-center text-nbbl-red"
              >
                View all notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-600"
              aria-label="Messages"
            >
              <Mail className="h-5 w-5" />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-nbbl-red text-[10px] text-white">
                {headerContent.messageCount}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Messages</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {headerContent.messages.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="flex-col items-start gap-0.5 py-2"
              >
                <span className="font-medium text-gray-900">{item.from}</span>
                <span className="text-xs text-gray-500">{item.preview}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={headerContent.messagesHref}
                className="justify-center text-nbbl-red"
              >
                Open inbox
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50 md:flex"
              aria-label="Account menu"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nbbl-gold text-sm font-semibold text-black">
                {user?.displayName?.slice(0, 1) ?? "J"}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.displayName ?? "User"}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.title ?? "Member"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-gray-900">
                {user?.displayName ?? "User"}
              </p>
              <p className="text-xs font-normal text-gray-500">
                {user?.title ?? "Member"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={profileHref} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                {profileLabel}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-nbbl-red focus:text-nbbl-red"
              onSelect={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
