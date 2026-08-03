"use client";

import { MEMBERSHIP_SEGMENTS, REVENUE_LAST_MONTH, REVENUE_THIS_MONTH } from "./dashboard-data";

function seriesToPath(values: number[], width: number, height: number, padY: number) {
  const step = width / (values.length - 1);
  const innerH = height - padY * 2;
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - padY - v * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function RevenueOverviewChart() {
  const w = 640;
  const h = 220;
  const padY = 16;
  const thisPath = seriesToPath(REVENUE_THIS_MONTH, w, h, padY);
  const lastPath = seriesToPath(REVENUE_LAST_MONTH, w, h, padY);
  const yLabels = ["$30K", "$20K", "$10K", "$0"];

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-nbbl-red" />
          This Month
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-gray-300" />
          Last Month
        </span>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col justify-between py-1 text-[10px] text-gray-400">
          {yLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="h-auto w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Revenue overview chart"
          >
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1={0}
                x2={w}
                y1={h - padY - ratio * (h - padY * 2)}
                y2={h - padY - ratio * (h - padY * 2)}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
            ))}
            <path d={lastPath} fill="none" stroke="#d1d5db" strokeWidth={2} />
            <path d={thisPath} fill="none" stroke="var(--nbbl-red)" strokeWidth={2.5} />
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
            <span>May 1</span>
            <span>May 15</span>
            <span>May 31</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MembershipStatusChart() {
  const total = MEMBERSHIP_SEGMENTS.reduce((sum, s) => sum + s.count, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="14"
          />
          {MEMBERSHIP_SEGMENTS.map((seg) => {
            const dash = (seg.count / total) * c;
            const el = (
              <circle
                key={seg.label}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{total.toLocaleString()}</span>
          <span className="text-xs text-gray-500">Members</span>
        </div>
      </div>
      <div className="w-full min-w-0">
        {MEMBERSHIP_SEGMENTS.map((seg) => (
          <div
            key={seg.label}
            className="grid grid-cols-[0.625rem_1fr_auto_auto] items-center gap-x-2 border-b border-gray-100 py-2.5 text-sm last:border-b-0"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="min-w-0 truncate text-gray-700">{seg.label}</span>
            <span className="shrink-0 pl-2 font-medium tabular-nums text-gray-900">
              {seg.count.toLocaleString()}
            </span>
            <span className="w-9 shrink-0 text-right tabular-nums text-gray-500">
              {seg.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
