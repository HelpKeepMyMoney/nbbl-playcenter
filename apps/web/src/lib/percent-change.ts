export function calcPercentChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export function formatPercentChange(
  current: number,
  previous: number
): string {
  const change = calcPercentChange(current, previous);
  if (change === null) {
    return current > 0 ? "New" : "0%";
  }
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}
