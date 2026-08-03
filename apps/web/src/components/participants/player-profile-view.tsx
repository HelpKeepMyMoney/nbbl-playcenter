"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Calendar,
  Mail,
  Pencil,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantAvatar } from "@/components/participants/participant-avatar";
import { ParticipantFormDialog } from "@/components/participants/participant-form-dialog";
import { ParticipantMessageDialog } from "@/components/participants/participant-message-dialog";
import { ParticipantScheduleDialog } from "@/components/participants/participant-schedule-dialog";
import { PlayerGameLogTab } from "@/components/participants/player-game-log-tab";
import { PlayerMembershipTab } from "@/components/participants/player-membership-tab";
import { PlayerStatisticsTab } from "@/components/participants/player-statistics-tab";
import {
  AttendanceDonut,
  RatingRing,
  SkillRadarChart,
} from "@/components/participants/profile-charts";
import {
  buildPlayerProfileViewModel,
  participantShowsGameStatistics,
} from "@/lib/player-profile-demo";
import { computePlayerStatistics } from "@/lib/player-statistics";
import { cn } from "@/lib/utils";
import type { OrganizationDoc, ParticipantDoc, PlayerMembershipDoc } from "@/types/firestore";
import type { TeamDoc } from "@/types/firestore";

const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "membership", label: "Membership" },
  { id: "statistics", label: "Statistics" },
  { id: "evaluations", label: "Evaluations" },
  { id: "development", label: "Development Plan" },
  { id: "attendance", label: "Attendance" },
  { id: "game-log", label: "Game Log" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
] as const;

export function PlayerProfileView({
  participant,
  organizations,
  teams,
  memberships,
  playerMembership,
  readOnly = false,
  headerActions,
}: {
  participant: ParticipantDoc;
  organizations: OrganizationDoc[];
  teams: TeamDoc[];
  memberships: { teamId: string; role: string }[];
  playerMembership?: PlayerMembershipDoc | null;
  readOnly?: boolean;
  headerActions?: React.ReactNode;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const orgName = useMemo(
    () =>
      organizations.find((o) => o.id === participant.organizationId)?.name,
    [organizations, participant.organizationId]
  );

  const primaryTeam = useMemo(() => {
    const teamId = memberships[0]?.teamId;
    return teamId ? teams.find((t) => t.id === teamId) : undefined;
  }, [memberships, teams]);

  const profile = useMemo(
    () => buildPlayerProfileViewModel(participant, primaryTeam, orgName),
    [participant, primaryTeam, orgName]
  );

  const playerStatistics = useMemo(
    () =>
      computePlayerStatistics(
        participant.gameLog,
        participant.gameSeasonStats
      ),
    [participant.gameLog, participant.gameSeasonStats]
  );

  const isPlayer = participantShowsGameStatistics(participant.type);
  const profileTabs = useMemo(
    () =>
      isPlayer
        ? PROFILE_TABS
        : PROFILE_TABS.filter(
            (tab) => tab.id !== "statistics" && tab.id !== "game-log"
          ),
    [isPlayer]
  );

  const bioTitle =
    participant.type === "coach"
      ? "Coach Bio"
      : participant.type === "staff"
        ? "Staff Bio"
        : isPlayer
          ? "Player Bio"
          : "Bio";
  const tagsTitle =
    participant.type === "coach"
      ? "Coaching Tags"
      : participant.type === "staff"
        ? "Staff Tags"
        : isPlayer
          ? "Player Tags"
          : "Tags";
  const focusTitle =
    participant.type === "coach"
      ? "Coaching Focus"
      : participant.type === "staff"
        ? "Responsibilities"
        : "Development Focus";

  const fullName = `${participant.firstName} ${participant.lastName}`;
  const attendanceTotal =
    profile.attendance.present +
    profile.attendance.late +
    profile.attendance.absent +
    profile.attendance.excused;

  const activityDot: Record<string, string> = {
    red: "bg-nbbl-red",
    green: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
  };

  return (
    <>
      <div className="space-y-4 bg-nbbl-surface p-4 lg:p-6">
        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-1 gap-5">
                <ParticipantAvatar participant={participant} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {fullName}
                    </h2>
                    {participant.type === "player" ? (
                      <span className="text-xl font-bold text-nbbl-red">
                        #{profile.jerseyNumber}
                      </span>
                    ) : null}
                    {headerActions}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {participant.type === "player" ? (
                      <>
                        {profile.position} • {profile.height} • {profile.weight}{" "}
                        • {profile.handedness}
                      </>
                    ) : (
                      <span className="capitalize">{participant.type}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {profile.dateOfBirth} • {profile.location} •{" "}
                    {profile.graduationClass}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                      {profile.teamLabel}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {profile.facilityLabel}
                    </span>
                    <span className="rounded-full bg-amber-50/80 px-3 py-1 text-xs font-medium text-amber-900">
                      {profile.divisionLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-4 lg:min-w-[220px] lg:items-end">
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Badge
                    variant={
                      participant.status === "active" ? "success" : "muted"
                    }
                  >
                    {participant.status === "active"
                      ? "Active"
                      : participant.status}
                  </Badge>
                </div>
                <dl className="space-y-2 text-sm lg:text-right">
                  <div>
                    <dt className="text-gray-500">NBBL ID</dt>
                    <dd className="font-medium text-gray-900">
                      {profile.nbblId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Member Since</dt>
                    <dd className="font-medium text-gray-900">
                      {profile.memberSince}
                    </dd>
                  </div>
                  {participant.type === "player" ? (
                    <div>
                      <dt className="text-gray-500">Parent/Guardian</dt>
                      <dd className="font-medium text-gray-900">
                        {profile.parentGuardian}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-gray-500">Contact</dt>
                    <dd className="font-medium text-gray-900">
                      {participant.phone ?? "—"}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {!readOnly ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => setMessageOpen(true)}
                      >
                        <Mail className="mr-1 h-4 w-4" />
                        Message
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => setScheduleOpen(true)}
                      >
                        <Calendar className="mr-1 h-4 w-4" />
                        Schedule
                      </Button>
                      <Button size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-1 h-4 w-4" />
                        Edit profile
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <Tabs.List className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2">
            {profileTabs.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 border-b-2 border-transparent px-4 py-3 text-sm text-gray-500 transition-colors",
                  "data-[state=active]:border-nbbl-red data-[state=active]:font-medium data-[state=active]:text-gray-900",
                  "hover:text-gray-800"
                )}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="overview" className="outline-none">
            <div className="grid gap-4 xl:grid-cols-[1fr_280px_260px]">
              <div className="space-y-4">
                {isPlayer ? (
                  <>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base">
                          Season Overview
                        </CardTitle>
                        <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-600">
                          <option>2024 Season</option>
                        </select>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            ["Games Played", profile.seasonStats.gamesPlayed],
                            [
                              "Points Per Game",
                              profile.seasonStats.pointsPerGame,
                            ],
                            [
                              "Rebounds Per Game",
                              profile.seasonStats.reboundsPerGame,
                            ],
                            [
                              "Assists Per Game",
                              profile.seasonStats.assistsPerGame,
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={String(label)}
                              className="rounded-lg bg-gray-50 px-3 py-4 text-center"
                            >
                              <p className="text-xs text-gray-500">{label}</p>
                              <p className="mt-1 text-2xl font-bold text-gray-900">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Skill Ratings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SkillRadarChart skills={profile.skills} />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">
                          Recent Game Performance
                        </CardTitle>
                        <button
                          type="button"
                          className="text-xs font-medium text-nbbl-red hover:underline"
                          onClick={() => setActiveTab("game-log")}
                        >
                          View Game Log
                        </button>
                      </CardHeader>
                      <CardContent className="overflow-x-auto p-0 pb-2">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50 text-left text-gray-500">
                            <tr>
                              <th className="px-3 py-2 font-medium">Date</th>
                              <th className="px-3 py-2 font-medium">
                                Opponent
                              </th>
                              <th className="px-3 py-2 font-medium">Result</th>
                              <th className="px-3 py-2 font-medium">MIN</th>
                              <th className="px-3 py-2 font-medium">PTS</th>
                              <th className="px-3 py-2 font-medium">REB</th>
                              <th className="px-3 py-2 font-medium">AST</th>
                              <th className="px-3 py-2 font-medium">STL</th>
                              <th className="px-3 py-2 font-medium">FG%</th>
                              <th className="px-3 py-2 font-medium">3P%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.recentGames.map((g, i) => (
                              <tr
                                key={g.matchId ?? `${g.date}-${g.opponent}-${i}`}
                                className="border-t border-gray-100"
                              >
                                <td className="px-3 py-2 text-gray-600">
                                  {g.date}
                                </td>
                                <td className="px-3 py-2 font-medium text-gray-900">
                                  {g.opponent}
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2 font-medium",
                                    g.win
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  )}
                                >
                                  {g.result}
                                </td>
                                <td className="px-3 py-2">{g.min}</td>
                                <td className="px-3 py-2">{g.pts}</td>
                                <td className="px-3 py-2">{g.reb}</td>
                                <td className="px-3 py-2">{g.ast}</td>
                                <td className="px-3 py-2">{g.stl}</td>
                                <td className="px-3 py-2">{g.fgPct}</td>
                                <td className="px-3 py-2">{g.threePct}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Role overview</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-relaxed text-gray-600">
                      {participant.type === "coach" || participant.type === "staff"
                        ? `${fullName} is not on the game roster. Season and game statistics are tracked for players only. Use the panels on the right for role-specific information, attendance, and activity.`
                        : `Game statistics are not shown for ${participant.type} participants.`}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Attendance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                    <AttendanceDonut {...profile.attendance} />
                    <ul className="space-y-2 text-sm">
                      {[
                        ["Present", profile.attendance.present, "#10b981"],
                        ["Late", profile.attendance.late, "#f59e0b"],
                        ["Absent", profile.attendance.absent, "#ef4444"],
                        ["Excused", profile.attendance.excused, "#9ca3af"],
                      ].map(([label, count, color]) => (
                        <li
                          key={String(label)}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: String(color) }}
                          />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-semibold text-gray-900">
                            {count}
                          </span>
                        </li>
                      ))}
                      <li className="pt-1 text-xs text-gray-500">
                        {attendanceTotal} total events
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{bioTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-gray-600">
                    {profile.bio}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Achievements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {profile.achievements.map((a) => (
                        <li key={a} className="flex gap-2">
                          <Star className="mt-0.5 h-4 w-4 shrink-0 text-nbbl-gold" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{tagsTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {profile.playerTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </CardContent>
                </Card>
                {memberships.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Teams</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {memberships.map((m, i) => (
                          <li key={`${m.teamId}-${i}`}>
                            <Link
                              href={`/teams?teamId=${m.teamId}`}
                              className="font-medium text-nbbl-red hover:underline"
                            >
                              {teams.find((t) => t.id === m.teamId)?.name ??
                                m.teamId}
                            </Link>
                            <span className="text-gray-500 capitalize">
                              {" "}
                              · {m.role}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              <div className="space-y-4">
                {isPlayer ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Overall Rating
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <RatingRing value={profile.overallRating} />
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        Advanced Level
                      </p>
                      <p className="text-xs text-gray-500">
                        Top 15% in {profile.divisionLabel}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
                {profile.developmentFocus.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{focusTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profile.developmentFocus.map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="font-medium text-gray-900">
                            {item.value}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-nbbl-red"
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                ) : null}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Next Evaluation</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="font-semibold text-gray-900">
                      {profile.nextEvaluation.date}
                    </p>
                    <p className="text-gray-600">
                      {profile.nextEvaluation.title}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full border-nbbl-red text-nbbl-red hover:bg-red-50"
                    >
                      Schedule Evaluation
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {profile.recentActivity.map((item) => (
                        <li key={item.title} className="flex gap-3 text-sm">
                          <span
                            className={cn(
                              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                              activityDot[item.tone]
                            )}
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.title}
                            </p>
                            <p className="text-gray-600">{item.detail}</p>
                            <p className="text-xs text-gray-400">{item.when}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Tabs.Content>

          {isPlayer ? (
            <Tabs.Content value="statistics" className="outline-none">
              <PlayerStatisticsTab stats={playerStatistics} playerName={fullName} />
            </Tabs.Content>
          ) : null}

          {isPlayer ? (
            <Tabs.Content value="game-log" className="outline-none">
              <PlayerGameLogTab gameLog={participant.gameLog} playerName={fullName} />
            </Tabs.Content>
          ) : null}

          <Tabs.Content value="membership" className="outline-none">
            <PlayerMembershipTab
              participant={participant}
              membership={playerMembership}
            />
          </Tabs.Content>

          {profileTabs
            .filter(
              (t) =>
                t.id !== "overview" &&
                t.id !== "membership" &&
                t.id !== "statistics" &&
                t.id !== "game-log"
            )
            .map((tab) => (
              <Tabs.Content
                key={tab.id}
                value={tab.id}
                className="outline-none"
              >
                <Card>
                  <CardContent className="py-12 text-center text-sm text-gray-500">
                    {tab.label} for {fullName} will be available in a future
                    release. Overview shows the latest summary data.
                  </CardContent>
                </Card>
              </Tabs.Content>
            ))}
        </Tabs.Root>
      </div>

      {!readOnly ? (
        <>
          <ParticipantFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            participant={participant}
            organizations={organizations}
          />
          <ParticipantMessageDialog
            open={messageOpen}
            onOpenChange={setMessageOpen}
            participant={participant}
          />
          <ParticipantScheduleDialog
            open={scheduleOpen}
            onOpenChange={setScheduleOpen}
            participant={participant}
          />
        </>
      ) : null}
    </>
  );
}
