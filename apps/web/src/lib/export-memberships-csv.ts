import type { PlayerMembershipDoc } from "@/types/firestore";

function escapeCsv(value: string | number | boolean | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

export function downloadMembershipsCsv(
  rows: PlayerMembershipDoc[],
  filename = "memberships.csv"
): void {
  const headers = [
    "Player",
    "Team",
    "Plan",
    "Amount",
    "Status",
    "Effective Date",
    "Next Billing",
    "Auto-Renew",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        escapeCsv(row.participantName),
        escapeCsv(row.teamName ?? ""),
        escapeCsv(row.planName),
        escapeCsv(`$${row.monthlyAmount}/mo`),
        escapeCsv(row.status),
        escapeCsv(formatDate(row.effectiveDate)),
        escapeCsv(formatDate(row.nextBillingDate)),
        escapeCsv(row.autoRenew ? "On" : "Off"),
      ].join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatMembershipDate(dateStr: string): string {
  return formatDate(dateStr);
}
