export function formatCurrentMonthRange(date = new Date()): string {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const startLabel = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}
