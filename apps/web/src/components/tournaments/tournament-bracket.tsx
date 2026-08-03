"use client";

import { formatMatchupLabel } from "@/lib/tournament-match-display";
import type { TournamentMatchDoc } from "@/types/firestore";

function MatchCard({ match }: { match: TournamentMatchDoc }) {
  const label =
    match.phase === "semifinal"
      ? "Semifinal"
      : match.phase === "championship"
        ? "Championship"
        : match.phase;

  return (
    <div className="rounded-lg border bg-white p-3 text-sm shadow-sm">
      <div className="mb-1 text-xs font-medium uppercase text-gray-400">
        {label}
      </div>
      <div className="font-medium">{formatMatchupLabel(match)}</div>
      {match.status === "completed" &&
        match.homeScore != null &&
        match.awayScore != null && (
          <div className="mt-1 text-gray-500">
            {match.homeScore} – {match.awayScore}
            {match.winnerId && (
              <span className="ml-2 text-green-600">
                Winner:{" "}
                {match.winnerId === match.homeTeamId
                  ? match.homeTeamName
                  : match.awayTeamName}
              </span>
            )}
          </div>
        )}
    </div>
  );
}

export function TournamentBracket({
  matches,
  division,
}: {
  matches: TournamentMatchDoc[];
  division: string;
}) {
  const divisionMatches = matches.filter((m) => m.division === division);
  const semis = divisionMatches
    .filter((m) => m.phase === "semifinal")
    .sort(
      (a, b) =>
        (a.homeSeed ?? 99) - (b.homeSeed ?? 99) ||
        a.slotNumber - b.slotNumber
    );
  const final = divisionMatches.find((m) => m.phase === "championship");

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{division} Playoff Bracket</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase text-gray-400">
            Semifinals (#1 vs #4, #2 vs #3)
          </p>
          {semis.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase text-gray-400">
            Championship
          </p>
          {final ? (
            <MatchCard match={final} />
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-400">
              Championship matchup pending semifinal results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
