"use client";

import { cn } from "@/lib/utils";

export function SkillRadarChart({
  skills,
  className,
}: {
  skills: { label: string; value: number }[];
  className?: string;
}) {
  const center = 130;
  const maxR = 72;
  const n = skills.length;
  const angleStep = (Math.PI * 2) / n;

  function point(i: number, r: number) {
    const a = -Math.PI / 2 + i * angleStep;
    return {
      x: center + r * Math.cos(a),
      y: center + r * Math.sin(a),
    };
  }

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = skills
    .map((s, i) => point(i, (s.value / 100) * maxR))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  return (
    <div className={cn("relative mx-auto w-full max-w-[280px]", className)}>
      <svg viewBox="0 0 260 260" className="h-auto w-full">
        {gridLevels.map((level) => {
          const pts = Array.from({ length: n }, (_, i) => {
            const p = point(i, maxR * level);
            return `${p.x},${p.y}`;
          }).join(" ");
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}
        {skills.map((_, i) => {
          const p = point(i, maxR);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={dataPoints}
          fill="rgba(225, 29, 72, 0.2)"
          stroke="var(--nbbl-red)"
          strokeWidth={2}
        />
        {skills.map((s, i) => {
          const labelPt = point(i, maxR + 22);
          const valuePt = point(i, (s.value / 100) * maxR);
          return (
            <g key={s.label}>
              <circle cx={valuePt.x} cy={valuePt.y} r={3} fill="var(--nbbl-red)" />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-600 text-[9px]"
              >
                {s.label}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 11}
                textAnchor="middle"
                className="fill-gray-900 text-[9px] font-semibold"
              >
                {s.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AttendanceDonut({
  present,
  late,
  absent,
  excused,
}: {
  present: number;
  late: number;
  absent: number;
  excused: number;
}) {
  const total = present + late + absent + excused;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  const segments = [
    { value: present, color: "#10b981" },
    { value: late, color: "#f59e0b" },
    { value: absent, color: "#ef4444" },
    { value: excused, color: "#9ca3af" },
  ];
  let offset = 0;

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="14"
        />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * c;
          const el = (
            <circle
              key={i}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{pct}%</span>
        <span className="text-xs text-gray-500">Attendance</span>
      </div>
    </div>
  );
}

export function ScoringTrendChart({
  games,
  maxPts,
  className,
}: {
  games: { date: string; opponent: string; pts: number; win: boolean }[];
  maxPts?: number;
  className?: string;
}) {
  if (games.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">No scoring data available.</p>
    );
  }

  const maxPoints = Math.max(...games.map((g) => g.pts), maxPts ?? 10);
  const chartHeight = 160;
  const barWidth = Math.min(32, Math.max(12, 280 / games.length - 4));
  const gap = 4;
  const totalWidth = games.length * (barWidth + gap);

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${Math.max(totalWidth, 280)} ${chartHeight + 40}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {games.map((g, i) => {
          const barHeight = (g.pts / maxPoints) * chartHeight;
          const x = i * (barWidth + gap);
          const y = chartHeight - barHeight;
          return (
            <g key={`${g.date}-${g.opponent}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={g.win ? "var(--nbbl-red)" : "#9ca3af"}
              />
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-gray-700 text-[8px] font-semibold"
              >
                {g.pts}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                className="fill-gray-500 text-[7px]"
              >
                {g.date}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--nbbl-red)]" />
          Win
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-400" />
          Loss
        </span>
      </div>
    </div>
  );
}

export function StatBarChart({
  bars,
  className,
}: {
  bars: { label: string; value: number; max: number; color: string }[];
  className?: string;
}) {
  const chartWidth = 260;
  const barHeight = 24;
  const gap = 12;
  const labelWidth = 36;
  const barAreaWidth = chartWidth - labelWidth - 40;

  return (
    <div className={cn("mx-auto w-full max-w-[280px]", className)}>
      <svg
        viewBox={`0 0 ${chartWidth} ${bars.length * (barHeight + gap)}`}
        className="h-auto w-full"
      >
        {bars.map((bar, i) => {
          const y = i * (barHeight + gap);
          const width = Math.min(barAreaWidth, (bar.value / bar.max) * barAreaWidth);
          return (
            <g key={bar.label}>
              <text
                x={0}
                y={y + barHeight / 2}
                dominantBaseline="middle"
                className="fill-gray-600 text-[11px] font-medium"
              >
                {bar.label}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={barAreaWidth}
                height={barHeight}
                rx={4}
                fill="#f3f4f6"
              />
              <rect
                x={labelWidth}
                y={y}
                width={width}
                height={barHeight}
                rx={4}
                fill={bar.color}
              />
              <text
                x={labelWidth + barAreaWidth + 6}
                y={y + barHeight / 2}
                dominantBaseline="middle"
                className="fill-gray-900 text-[11px] font-semibold"
              >
                {bar.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function RatingRing({ value, max = 100 }: { value: number; max?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const filled = (value / max) * c;

  return (
    <div className="relative mx-auto h-32 w-32">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--nbbl-red)"
          strokeWidth="8"
          strokeDasharray={`${filled} ${c - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-xs text-gray-500">/ {max}</span>
      </div>
    </div>
  );
}
