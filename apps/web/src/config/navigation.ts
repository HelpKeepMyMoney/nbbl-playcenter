export type NavItem = {

  href: string;

  label: string;

  icon: string;

};



export type MobileTabItem = {

  href: string;

  label: string;

  icon: "home" | "calendar" | "users" | "message" | "more";

  badge?: number;

};



export const NAV_ITEMS: readonly NavItem[] = [

  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },

  { href: "/participants", label: "Participants", icon: "users" },

  { href: "/teams", label: "Teams", icon: "shield" },

  { href: "/tournaments", label: "Tournaments", icon: "medal" },

  { href: "/schedules", label: "Schedules", icon: "calendar" },

  { href: "/binodes", label: "BINodes", icon: "network" },

  { href: "/facilities", label: "Facilities", icon: "building" },

  { href: "/memberships", label: "Memberships", icon: "id-card" },

  { href: "/payments", label: "Payments", icon: "credit-card" },

  { href: "/communications", label: "Communications", icon: "messages-square" },

  { href: "/reports", label: "Reports", icon: "bar-chart-3" },

  { href: "/check-in", label: "Check-In", icon: "scan-line" },

  { href: "/documents", label: "Documents", icon: "file-text" },

  { href: "/administration", label: "Administration", icon: "settings" },

];



export const PLAYER_NAV_ITEMS: readonly NavItem[] = [

  { href: "/player/dashboard", label: "Dashboard", icon: "layout-dashboard" },

  { href: "/player/profile", label: "My Profile", icon: "user" },

  { href: "/player/team", label: "My Team", icon: "shield" },

  { href: "/player/schedule", label: "Schedule", icon: "calendar" },

  { href: "/player/messages", label: "Messages", icon: "messages-square" },

  { href: "/player/documents", label: "Documents", icon: "file-text" },

  { href: "/player/membership", label: "Membership", icon: "id-card" },

];



export const COACH_NAV_ITEMS: readonly NavItem[] = [

  { href: "/coach/dashboard", label: "Dashboard", icon: "layout-dashboard" },

  { href: "/coach/profile", label: "My Profile", icon: "user" },

  { href: "/coach/team", label: "My Team", icon: "shield" },

  { href: "/coach/schedule", label: "Schedule", icon: "calendar" },

  { href: "/coach/tournaments", label: "Tournaments", icon: "medal" },

  { href: "/coach/messages", label: "Messages", icon: "messages-square" },

];



export const FAN_NAV_ITEMS: readonly NavItem[] = [

  { href: "/fan/dashboard", label: "Dashboard", icon: "layout-dashboard" },

  { href: "/fan/videos", label: "Videos", icon: "play-circle" },

  { href: "/fan/teams", label: "Teams", icon: "shield" },

  { href: "/fan/players", label: "Players", icon: "users" },

  { href: "/fan/merch", label: "Merch", icon: "shopping-bag" },

  { href: "/fan/schedule", label: "Schedule", icon: "calendar" },

  { href: "/fan/tournaments", label: "Tournaments", icon: "medal" },

  { href: "/fan/profile", label: "My Profile", icon: "user" },

];



export const ADMIN_MOBILE_TABS: readonly MobileTabItem[] = [

  { href: "/dashboard", label: "Dashboard", icon: "home" },

  { href: "/schedules", label: "Schedule", icon: "calendar" },

  { href: "/teams", label: "Teams", icon: "users" },

  { href: "/communications", label: "Messages", icon: "message", badge: 3 },

  { href: "/more", label: "More", icon: "more" },

];



export const PLAYER_MOBILE_TABS: readonly MobileTabItem[] = [

  { href: "/player/dashboard", label: "Dashboard", icon: "home" },

  { href: "/player/schedule", label: "Schedule", icon: "calendar" },

  { href: "/player/team", label: "My Team", icon: "users" },

  { href: "/player/messages", label: "Messages", icon: "message", badge: 3 },

  { href: "/player/documents", label: "More", icon: "more" },

];



export const COACH_MOBILE_TABS: readonly MobileTabItem[] = [

  { href: "/coach/dashboard", label: "Dashboard", icon: "home" },

  { href: "/coach/schedule", label: "Schedule", icon: "calendar" },

  { href: "/coach/team", label: "My Team", icon: "users" },

  { href: "/coach/messages", label: "Messages", icon: "message", badge: 3 },

  { href: "/coach/profile", label: "More", icon: "more" },

];



export const FAN_MOBILE_TABS: readonly MobileTabItem[] = [

  { href: "/fan/dashboard", label: "Dashboard", icon: "home" },

  { href: "/fan/schedule", label: "Schedule", icon: "calendar" },

  { href: "/fan/tournaments", label: "Tournaments", icon: "users" },

  { href: "/fan/videos", label: "Videos", icon: "message" },

  { href: "/fan/profile", label: "More", icon: "more" },

];



export function resolveNavItems(roleKeys?: string[]): readonly NavItem[] {

  if (roleKeys?.includes("player")) {

    return PLAYER_NAV_ITEMS;

  }

  if (roleKeys?.includes("coach")) {

    return COACH_NAV_ITEMS;

  }

  if (roleKeys?.includes("fan")) {

    return FAN_NAV_ITEMS;

  }

  return NAV_ITEMS;

}



export function resolveMobileTabs(roleKeys?: string[]): readonly MobileTabItem[] {

  if (roleKeys?.includes("player")) {

    return PLAYER_MOBILE_TABS;

  }

  if (roleKeys?.includes("coach")) {

    return COACH_MOBILE_TABS;

  }

  if (roleKeys?.includes("fan")) {

    return FAN_MOBILE_TABS;

  }

  return ADMIN_MOBILE_TABS;

}



export function isLeagueAdminRoute(pathname: string): boolean {

  return (

    !pathname.startsWith("/player") &&

    !pathname.startsWith("/coach") &&

    !pathname.startsWith("/fan") &&

    pathname !== "/login"

  );

}


