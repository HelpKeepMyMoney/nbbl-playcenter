"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamFormDialog } from "@/components/teams/team-form-dialog";
import {
  computeTeamRecordFromMatches,
  formatMatchupLabel,
  formatMatchPhase,
} from "@/lib/tournament-match-display";
import {
  useTeamActivity,
  useTeamMemberships,
} from "@/hooks/use-teams";
import { useTeamEvents } from "@/hooks/use-circuit-data";
import { useTeamTournamentMatches } from "@/hooks/use-tournaments";
import { useTeamMutations } from "@/hooks/use-team-mutations";
import { useParticipants } from "@/hooks/use-participants";
import { ParticipantAvatar } from "@/components/participants/participant-avatar";
import type { TeamDoc } from "@/types/firestore";
import { cn } from "@/lib/utils";

export function TeamDetailPane({
  team,
  orgName,
  className,
  readOnly = false,
  getPlayerProfileHref,
}: {
  team: TeamDoc;
  orgName?: string;
  className?: string;
  readOnly?: boolean;
  getPlayerProfileHref?: (participantId: string) => string;
}) {
  const [tab, setTab] = useState<
    "overview" | "roster" | "schedule" | "statistics" | "documents"
  >("overview");
  const [editOpen, setEditOpen] = useState(false);
  const { data: memberships = [] } = useTeamMemberships(team.id);
  const { data: activity = [] } = useTeamActivity(team.id);
  const { data: teamEvents = [] } = useTeamEvents(team.id);
  const { data: tournamentGames = [], isLoading: tournamentGamesLoading } =
    useTeamTournamentMatches(team.id);
  const { data: participants = [] } = useParticipants();
  const { addMember, removeMember } = useTeamMutations();
  const [addPlayerId, setAddPlayerId] = useState("");

  const playerMemberships = useMemo(
    () => memberships.filter((m) => m.role === "player"),
    [memberships]
  );
  const participantById = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants]
  );

  const tournamentRecord = useMemo(
    () => computeTeamRecordFromMatches(team.id, tournamentGames),
    [team.id, tournamentGames]
  );

  const winPct =
    tournamentRecord.gamesPlayed > 0
      ? ((tournamentRecord.wins / tournamentRecord.gamesPlayed) * 100).toFixed(
          1
        )
      : "0.0";

  const recentGameActivity = useMemo(
    () =>
      [...tournamentGames]
        .filter(
          (g) =>
            g.status === "completed" &&
            g.homeScore != null &&
            g.awayScore != null
        )
        .sort((a, b) => b.scheduledStartAt.localeCompare(a.scheduledStartAt))
        .slice(0, 4)
        .map((g) => ({
          id: g.id,
          summary: `${formatMatchupLabel(g)} — Final ${g.homeScore}–${g.awayScore} (${g.tournamentTitle})`,
        })),
    [tournamentGames]
  );

  const displayActivity =
    activity.length > 0
      ? activity.slice(0, 4).map((item) => ({
          id: String(item.id),
          summary: String(item.summary),
        }))
      : recentGameActivity;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "roster", label: "Roster" },
    { id: "schedule", label: "Schedule" },
    { id: "statistics", label: "Statistics" },
    { id: "documents", label: "Documents" },
  ] as const;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="shrink-0 bg-gradient-to-br from-black to-zinc-800 p-5 text-white">
        <div className="mb-3 flex items-start justify-between gap-2 pr-8">
          <div>
            <h3 id="team-detail-title" className="text-lg font-semibold">
              {team.name}
            </h3>
            <p className="text-xs text-white/70">
              {orgName ?? team.organizationId} | {team.division} •{" "}
              {team.ageGroup}
            </p>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-200">Active</Badge>
        </div>
        {!readOnly ? (
          <Button
            size="sm"
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={() => setEditOpen(true)}
          >
            Edit Team
          </Button>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-4 border-b border-gray-100 bg-white px-4 pt-3 text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 pb-2",
              tab === t.id
                ? "border-b-2 border-nbbl-red font-medium text-gray-900"
                : "text-gray-500"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">
        {tab === "overview" && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-gray-500">Head Coach</dt>
                <dd className="font-medium">{team.headCoachName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Assistant Coach</dt>
                <dd className="font-medium">
                  {team.assistantCoachName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Team Manager</dt>
                <dd className="font-medium">{team.teamManagerName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Home Facility / BINode</dt>
                <dd className="font-medium">
                  {team.homeFacilityName ?? "NBBL Academy"} —{" "}
                  {team.homeBinodeId ?? "PHX-01"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Practice Days</dt>
                <dd className="font-medium">
                  {team.practiceDays?.join(", ") ?? "—"}
                </dd>
              </div>
            </dl>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold">Season Statistics</h4>
                <button
                  type="button"
                  className="text-xs text-nbbl-red"
                  onClick={() => setTab("statistics")}
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 rounded-lg bg-gray-50 p-3 text-center">
                <div>
                  <p className="text-xs text-gray-500">Games</p>
                  <p className="font-semibold">
                    {tournamentRecord.gamesPlayed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Wins</p>
                  <p className="font-semibold text-emerald-600">
                    {tournamentRecord.wins}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Losses</p>
                  <p className="font-semibold text-red-600">
                    {tournamentRecord.losses}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Win %</p>
                  <p className="font-semibold text-amber-600">{winPct}%</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Recent Activity</h4>
              <ul className="space-y-2">
                {tournamentGamesLoading ? (
                  <li className="text-gray-500">Loading games…</li>
                ) : displayActivity.length === 0 ? (
                  <li className="text-gray-500">No recent activity.</li>
                ) : (
                  displayActivity.map((item) => (
                    <li key={item.id} className="text-gray-700">
                      {item.summary}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {tab === "roster" && (
          <div className="space-y-3">
            {!readOnly ? (
              <div className="flex gap-2">
                <select
                  className="h-9 flex-1 rounded-lg border border-gray-200 px-2 text-sm"
                  value={addPlayerId}
                  onChange={(e) => setAddPlayerId(e.target.value)}
                >
                  <option value="">Add player to roster...</option>
                  {participants
                    .filter((p) => p.type === "player")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  disabled={!addPlayerId}
                  onClick={() => {
                    if (!addPlayerId) return;
                    addMember.mutate({
                      teamId: team.id,
                      participantId: addPlayerId,
                      role: "player",
                    });
                    setAddPlayerId("");
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {playerMemberships.length === 0 ? (
                <li className="px-3 py-4 text-center text-gray-500">
                  No players on this roster yet.
                </li>
              ) : (
                playerMemberships.map((m) => {
                  const participant = participantById.get(m.participantId);
                  return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {participant ? (
                        <ParticipantAvatar participant={participant} size="sm" />
                      ) : null}
                      <span>
                        {getPlayerProfileHref ? (
                          <Link
                            href={getPlayerProfileHref(m.participantId)}
                            className="font-medium text-nbbl-red hover:underline"
                          >
                            {m.participantName}
                          </Link>
                        ) : (
                          m.participantName
                        )}{" "}
                        <span className="text-xs text-gray-500">({m.role})</span>
                      </span>
                    </span>
                    {!readOnly ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          removeMember.mutate({
                            teamId: team.id,
                            membershipId: m.id,
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </li>
                  );
                })
              )}
            </ul>
          </div>
        )}

        {tab === "schedule" && (
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 font-semibold">Practice schedule</h4>
              {team.practiceDays && team.practiceDays.length > 0 ? (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {team.practiceDays.map((day) => (
                    <li
                      key={day}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="font-medium">{day}</span>
                      <span className="text-xs text-gray-500">
                        {team.homeFacilityName ?? "NBBL Academy"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No practice days configured.</p>
              )}
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Scheduled events</h4>
              {teamEvents.length === 0 ? (
                <p className="text-gray-500">No events scheduled.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {teamEvents.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="font-medium">{ev.title}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(ev.startAt).toLocaleDateString()} · {ev.type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Games</h4>
              {tournamentGamesLoading ? (
                <p className="text-gray-500">Loading games…</p>
              ) : tournamentGames.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-gray-500">
                  No tournament games scheduled for this team yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {tournamentGames.map((match) => (
                    <li
                      key={match.id}
                      className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {formatMatchupLabel(match)}
                          {match.status === "completed" &&
                            match.homeScore != null &&
                            match.awayScore != null && (
                              <span className="ml-2 text-gray-500">
                                ({match.homeScore}–{match.awayScore})
                              </span>
                            )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {match.tournamentTitle} ·{" "}
                          {formatMatchPhase(match.phase, match.playoffRound)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {new Date(match.scheduledStartAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "statistics" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">Games played</p>
                <p className="text-2xl font-semibold">
                  {tournamentRecord.gamesPlayed}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">Wins</p>
                <p className="text-2xl font-semibold text-emerald-600">
                  {tournamentRecord.wins}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">Losses</p>
                <p className="text-2xl font-semibold text-red-600">
                  {tournamentRecord.losses}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">Win %</p>
                <p className="text-2xl font-semibold text-amber-600">
                  {winPct}%
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 p-4">
              <div>
                <dt className="text-gray-500">Roster size</dt>
                <dd className="font-medium">
                  {playerMemberships.length || team.playerCount}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Season</dt>
                <dd className="font-medium">{team.seasonId}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Division</dt>
                <dd className="font-medium">{team.division}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Age group</dt>
                <dd className="font-medium">{team.ageGroup}</dd>
              </div>
            </dl>
          </div>
        )}

        {tab === "documents" && (
          <div className="space-y-3">
            <p className="text-gray-600">
              Team waivers, rosters, and other files appear here.
            </p>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              <li className="px-3 py-4 text-center text-gray-500">
                No documents uploaded for this team.
              </li>
            </ul>
          </div>
        )}
      </div>

      {!readOnly ? (
        <TeamFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          team={team}
          organizations={[{ id: team.organizationId, name: orgName ?? "" }]}
        />
      ) : null}
    </div>
  );
}
