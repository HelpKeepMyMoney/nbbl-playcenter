"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerGameLogEntry } from "@nbbl/shared";
import { cn } from "@/lib/utils";

function formatPct(made: number, att: number): string {
  if (att === 0) return "0.0%";
  return `${((made / att) * 100).toFixed(1)}%`;
}

export function PlayerGameLogTab({
  gameLog,
  playerName,
}: {
  gameLog: PlayerGameLogEntry[] | null | undefined;
  playerName: string;
}) {
  const entries = gameLog ?? [];

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-sm font-medium text-gray-700">No game log entries</p>
          <p className="mt-2 text-sm text-gray-500">
            Game log for {playerName} will appear after tournament games are simulated.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Game Log</CardTitle>
        <span className="text-xs text-gray-500">{entries.length} games</span>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 pb-2">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Opponent</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2 font-medium">MIN</th>
              <th className="px-3 py-2 font-medium">PTS</th>
              <th className="px-3 py-2 font-medium">REB</th>
              <th className="px-3 py-2 font-medium">AST</th>
              <th className="px-3 py-2 font-medium">STL</th>
              <th className="px-3 py-2 font-medium">FG</th>
              <th className="px-3 py-2 font-medium">FG%</th>
              <th className="px-3 py-2 font-medium">3PT</th>
              <th className="px-3 py-2 font-medium">3P%</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((g) => (
              <tr key={g.matchId} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-600">{g.date}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{g.opponent}</td>
                <td
                  className={cn(
                    "px-3 py-2 font-medium",
                    g.win ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {g.result}
                </td>
                <td className="px-3 py-2">{g.min}</td>
                <td className="px-3 py-2 font-semibold">{g.pts}</td>
                <td className="px-3 py-2">{g.reb}</td>
                <td className="px-3 py-2">{g.ast}</td>
                <td className="px-3 py-2">{g.stl}</td>
                <td className="px-3 py-2">{g.fgMade}/{g.fgAtt}</td>
                <td className="px-3 py-2">{formatPct(g.fgMade, g.fgAtt)}</td>
                <td className="px-3 py-2">
                  {g.threeMade}/{g.threeAtt}
                </td>
                <td className="px-3 py-2">{formatPct(g.threeMade, g.threeAtt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
