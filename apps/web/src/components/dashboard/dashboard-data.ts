export const DASHBOARD_KPIS = [
  {
    label: "Total Participants",
    value: "1,248",
    trend: "12.5%",
    icon: "users" as const,
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    label: "Upcoming Events",
    value: "32",
    trend: "8.3%",
    icon: "calendar" as const,
    iconBg: "bg-rose-100 text-rose-600",
  },
  {
    label: "Active Teams",
    value: "84",
    trend: "5.7%",
    icon: "shield" as const,
    iconBg: "bg-yellow-100 text-yellow-700",
  },
  {
    label: "Total Revenue",
    value: "$24,560",
    trend: "15.2%",
    icon: "dollar" as const,
    iconBg: "bg-red-100 text-nbbl-red",
  },
] as const;

export const UPCOMING_EVENTS = [
  { month: "MAY", day: "12", title: "Practice", time: "4:00 PM", place: "Court 2" },
  { month: "MAY", day: "12", title: "Game", time: "6:30 PM", place: "Main Gym" },
  { month: "MAY", day: "13", title: "Tournament", time: "9:00 AM", place: "Court 1" },
  { month: "MAY", day: "14", title: "Championship", time: "7:00 PM", place: "Main Gym" },
] as const;

export const DASHBOARD_TASKS = [
  { title: "Approve 7 new registrations", priority: "High Priority", tone: "high" as const },
  { title: "Review tournament brackets", priority: "Medium Priority", tone: "medium" as const },
  { title: "Confirm game officials", priority: "Medium Priority", tone: "medium" as const },
  { title: "Monthly facility inspection", priority: "Low Priority", tone: "low" as const },
] as const;

export const RECENT_ACTIVITY = [
  {
    time: "10m ago",
    title: "New participant registered",
    detail: "John Smith joined U12 Eagles",
    tone: "user" as const,
  },
  {
    time: "1h ago",
    title: "Payment received",
    detail: "$125 from Williams Family",
    tone: "payment" as const,
  },
  {
    time: "2h ago",
    title: "Game result entered",
    detail: "Eagles 68 - Hawks 54",
    tone: "game" as const,
  },
  {
    time: "3h ago",
    title: "New message",
    detail: "From Coach Davis",
    tone: "message" as const,
  },
] as const;

export const MEMBERSHIP_SEGMENTS = [
  { label: "Active", count: 1018, pct: 81, color: "#10b981" },
  { label: "Pending", count: 156, pct: 12, color: "#f59e0b" },
  { label: "Expired", count: 74, pct: 6, color: "#ef4444" },
  { label: "Cancelled", count: 20, pct: 1, color: "#9ca3af" },
] as const;

/** Normalized revenue points (0–1) for May 1–31 mock series */
export const REVENUE_THIS_MONTH = [
  0.32, 0.38, 0.35, 0.42, 0.48, 0.45, 0.52, 0.5, 0.55, 0.58, 0.54, 0.6, 0.62, 0.58,
  0.65, 0.68, 0.64, 0.7, 0.72, 0.69, 0.75, 0.78, 0.74, 0.8, 0.82, 0.79, 0.85, 0.88, 0.84,
  0.9, 0.92,
];

export const REVENUE_LAST_MONTH = [
  0.28, 0.3, 0.32, 0.31, 0.35, 0.34, 0.38, 0.36, 0.4, 0.39, 0.42, 0.41, 0.44, 0.43, 0.46,
  0.45, 0.48, 0.47, 0.5, 0.49, 0.52, 0.51, 0.54, 0.53, 0.56, 0.55, 0.58, 0.57, 0.6, 0.59,
  0.62,
];
