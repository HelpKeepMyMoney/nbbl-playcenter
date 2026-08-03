"use client";

import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { formatMatchupLabel, formatMatchPhase, formatMatchTime } from "@/lib/tournament-match-display";
import type { TournamentDoc, TournamentMatchDoc } from "@/types/firestore";

function divisionBadge(division: string) {
  if (division === "Boys Division") {
    return <Badge variant="default">Boys</Badge>;
  }
  return <Badge variant="muted">Girls</Badge>;
}

export function TournamentSchedulePreview({
  tournament,
  matches,
  isError,
  errorMessage,
}: {
  tournament?: TournamentDoc | null;
  matches: TournamentMatchDoc[];
  isError?: boolean;
  errorMessage?: string;
}) {
  const breakAfter = tournament?.breakAfterGame;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Could not load schedule: {errorMessage ?? "Unknown error"}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <p className="text-gray-500">No games scheduled yet.</p>
        {tournament && tournament.totalGames > 0 && (
          <p className="mt-2 text-sm text-gray-400">
            This tournament expects {tournament.totalGames} games. Use{" "}
            <strong>Recalculate Schedule</strong> to generate them.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">Tournament Schedule</h3>
        {tournament && (
          <p className="text-sm text-gray-500">
            {tournament.totalGames} games · Break after game {tournament.breakAfterGame}{" "}
            ({tournament.lunchBreakMinutes} min)
          </p>
        )}
      </div>
      <div className="max-h-[32rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Division</th>
              <th className="px-4 py-2">Matchup</th>
              <th className="px-4 py-2">Round</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <Fragment key={match.id}>
                {breakAfter && match.slotNumber === breakAfter + 1 && (
                  <tr className="bg-amber-50">
                    <td colSpan={6} className="px-4 py-2 text-center text-xs font-medium text-amber-800">
                      Lunch break ({tournament?.lunchBreakMinutes ?? 60} min)
                    </td>
                  </tr>
                )}
                <tr
                  className={
                    match.division === "Boys Division"
                      ? "border-t bg-blue-50/30"
                      : "border-t bg-pink-50/30"
                  }
                >
                  <td className="px-4 py-2 font-mono">{match.slotNumber}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatMatchTime(match.scheduledStartAt)}
                  </td>
                  <td className="px-4 py-2">{divisionBadge(match.division)}</td>
                  <td className="px-4 py-2">
                    {formatMatchupLabel(match)}
                    {match.status === "completed" &&
                      match.homeScore != null &&
                      match.awayScore != null && (
                        <span className="ml-2 text-gray-500">
                          ({match.homeScore}–{match.awayScore})
                        </span>
                      )}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {formatMatchPhase(match.phase, match.playoffRound)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={
                        match.status === "completed" ? "success" : "muted"
                      }
                    >
                      {match.status}
                    </Badge>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
