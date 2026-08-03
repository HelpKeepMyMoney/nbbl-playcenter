"use client";

import { AppHeader, type BreadcrumbItem } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { AuthGate } from "@/components/auth/auth-gate";

export function AppShell({
  title,
  breadcrumb,
  children,
  darkMobile = false,
  showDesktopMenu = false,
}: {
  title: string;
  breadcrumb?: BreadcrumbItem[];
  children: React.ReactNode;
  darkMobile?: boolean;
  showDesktopMenu?: boolean;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-screen bg-nbbl-surface">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
          <AppHeader
            title={title}
            breadcrumb={breadcrumb}
            showDesktopMenu={showDesktopMenu}
          />
          <main
            className={
              darkMobile
                ? "flex-1 bg-black text-white lg:bg-nbbl-surface lg:text-gray-900"
                : "flex-1"
            }
          >
            {children}
          </main>
          <MobileTabBar />
        </div>
      </div>
    </AuthGate>
  );
}
