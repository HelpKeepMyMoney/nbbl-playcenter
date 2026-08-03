"use client";

import {
  Calendar,
  DollarSign,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useParticipants } from "@/hooks/use-participants";
import { usePlayerMemberships } from "@/hooks/use-player-memberships";
import { useTeams } from "@/hooks/use-teams";
import { useUpcomingTournamentGames } from "@/hooks/use-tournaments";
import { cn } from "@/lib/utils";

const iconMap = {
  users: Users,
  calendar: Calendar,
  shield: Shield,
  dollar: DollarSign,
} as const;

export function DashboardKpiGrid() {
  const { data: participants = [] } = useParticipants();
  const { data: teams = [] } = useTeams();
  const { data: memberships = [] } = usePlayerMemberships();
  const { data: upcomingGames = [] } = useUpcomingTournamentGames();

  const playerCount = participants.filter((p) => p.type === "player").length;
  const headCoachCount = new Set(
    teams
      .map((team) => team.headCoachParticipantId)
      .filter((id): id is string => Boolean(id))
  ).size;
  const activeMemberships = memberships.filter((m) => m.status === "active");
  const totalRevenue = activeMemberships.reduce(
    (sum, membership) => sum + (membership.monthlyAmount ?? 0),
    0
  );
  const upcomingTournamentIds = new Set(
    upcomingGames.map((game) => game.tournamentId)
  );

  const kpis = [
    {
      label: "Total Participants",
      value: String(playerCount),
      trend: `${playerCount} registered players`,
      icon: "users" as const,
      iconBg: "bg-amber-100 text-amber-700",
    },
    {
      label: "Upcoming Events",
      value: String(upcomingGames.length),
      trend: `${upcomingTournamentIds.size} tournament${upcomingTournamentIds.size === 1 ? "" : "s"}`,
      icon: "calendar" as const,
      iconBg: "bg-rose-100 text-rose-600",
    },
    {
      label: "Active Teams",
      value: String(teams.length),
      trend: `${headCoachCount} head coach${headCoachCount === 1 ? "" : "es"}`,
      icon: "shield" as const,
      iconBg: "bg-yellow-100 text-yellow-700",
    },
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      trend: `${activeMemberships.length} active membership${activeMemberships.length === 1 ? "" : "s"}`,
      icon: "dollar" as const,
      iconBg: "bg-red-100 text-nbbl-red",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = iconMap[kpi.icon];
        return (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {kpi.value}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                    {kpi.trend}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                    kpi.iconBg
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
