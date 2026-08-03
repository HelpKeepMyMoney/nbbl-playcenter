"use client";

import type { TournamentStandingDoc } from "@/types/firestore";

export function TournamentStandingsTable({
  standings,
  division,
}: {
  standings: TournamentStandingDoc[];
  division: string;
}) {
  const filtered = standings
    .filter((s) => s.division === division)
    .sort((a, b) => a.seed - b.seed);

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">{division}</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Seed</th>
            <th className="px-4 py-2">Team</th>
            <th className="px-4 py-2">W</th>
            <th className="px-4 py-2">L</th>
            <th className="px-4 py-2">PF</th>
            <th className="px-4 py-2">PA</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-4 py-2 font-mono">{s.seed}</td>
              <td className="px-4 py-2 font-medium">{s.teamName}</td>
              <td className="px-4 py-2">{s.wins}</td>
              <td className="px-4 py-2">{s.losses}</td>
              <td className="px-4 py-2">{s.pointsFor}</td>
              <td className="px-4 py-2">{s.pointsAgainst}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                No standings yet — complete round-robin games to rank teams.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
