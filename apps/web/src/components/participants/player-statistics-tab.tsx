"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoringTrendChart, StatBarChart } from "@/components/participants/profile-charts";
import type { PlayerStatistics } from "@/lib/player-statistics";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg bg-gray-50 px-3 py-4 text-center", className)}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-gray-400">{sub}</p> : null}
    </div>
  );
}

export function PlayerStatisticsTab({
  stats,
  playerName,
}: {
  stats: PlayerStatistics;
  playerName: string;
}) {
  if (!stats.hasData) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-sm font-medium text-gray-700">No game statistics yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Statistics for {playerName} will appear after tournament games are simulated.
            Run a simulation from the Tournaments page to generate box scores and season averages.
          </p>
        </CardContent>
      </Card>
    );
  }

  const perGameBars = [
    { label: "PTS", value: stats.pointsPerGame, max: 12, color: "var(--nbbl-red)" },
    { label: "REB", value: stats.reboundsPerGame, max: 5, color: "#3b82f6" },
    { label: "AST", value: stats.assistsPerGame, max: 4, color: "#10b981" },
    { label: "STL", value: stats.stealsPerGame, max: 3, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Season Averages</CardTitle>
          <span className="text-xs text-gray-500">{stats.gamesPlayed} games played</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <StatCard label="GP" value={stats.gamesPlayed} />
            <StatCard label="W" value={stats.wins} className="text-emerald-600" />
            <StatCard label="L" value={stats.losses} className="text-red-600" />
            <StatCard label="Win %" value={`${stats.winPct}%`} />
            <StatCard label="PPG" value={stats.pointsPerGame} />
            <StatCard label="RPG" value={stats.reboundsPerGame} />
            <StatCard label="APG" value={stats.assistsPerGame} />
            <StatCard label="SPG" value={stats.stealsPerGame} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scoring Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoringTrendChart games={stats.scoringTrend} maxPts={12} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-Game Averages</CardTitle>
          </CardHeader>
          <CardContent>
            <StatBarChart bars={perGameBars} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-100 p-4 text-center">
                <p className="text-xs text-gray-500">Field Goals</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.fgPct}%</p>
                <p className="mt-1 text-sm text-gray-600">
                  {stats.fgMade}/{stats.fgAtt}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-4 text-center">
                <p className="text-xs text-gray-500">3-Pointers</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.threePct}%</p>
                <p className="mt-1 text-sm text-gray-600">
                  {stats.threeMade}/{stats.threeAtt}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Minutes per game</dt>
                <dd className="font-semibold text-gray-900">{stats.minutesPerGame}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total minutes</dt>
                <dd className="font-semibold text-gray-900">{stats.totalMinutes}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Season Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Points", stats.totalPoints],
                ["Rebounds", stats.totalRebounds],
                ["Assists", stats.totalAssists],
                ["Steals", stats.totalSteals],
                ["FG Made", stats.fgMade],
                ["FG Attempted", stats.fgAtt],
                ["3PT Made", stats.threeMade],
                ["3PT Attempted", stats.threeAtt],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-lg font-semibold text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
            {stats.bestGame ? (
              <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm">
                <p className="font-medium text-amber-900">Best scoring game</p>
                <p className="text-amber-800">
                  {stats.bestGame.pts} pts vs {stats.bestGame.opponent} ({stats.bestGame.date})
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
