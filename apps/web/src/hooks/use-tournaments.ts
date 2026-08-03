"use client";

import { useQuery } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { DEFAULT_TENANT_ID } from "@nbbl/shared";
import { getClientDb } from "@/lib/firebase";
import { formatMatchupLabel } from "@/lib/tournament-match-display";
import { useAuthStore } from "@/stores/auth-store";
import type {
  TournamentDoc,
  TournamentMatchDoc,
  TournamentStandingDoc,
} from "@/types/firestore";

export function useTournaments() {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["tournaments", tenantId],
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "tournaments"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null),
        orderBy("title")
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as TournamentDoc)
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
        );
    },
  });
}

export function useTournament(tournamentId?: string) {
  return useQuery({
    queryKey: ["tournament", tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const snap = await getDoc(
        doc(getClientDb(), "tournaments", tournamentId!)
      );
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as TournamentDoc;
    },
  });
}

export function useTournamentMatches(tournamentId?: string) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["tournament-matches", tournamentId, tenantId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "tournamentMatches"),
        where("tenantId", "==", tenantId),
        where("tournamentId", "==", tournamentId)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as TournamentMatchDoc)
        .sort((a, b) => a.slotNumber - b.slotNumber);
    },
  });
}

export function useTournamentStandings(tournamentId?: string) {
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["tournament-standings", tournamentId, tenantId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const q = query(
        collection(getClientDb(), "tournamentStandings"),
        where("tenantId", "==", tenantId),
        where("tournamentId", "==", tournamentId)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as TournamentStandingDoc)
        .sort((a, b) => {
          const div = a.division.localeCompare(b.division);
          if (div !== 0) return div;
          return a.seed - b.seed;
        });
    },
  });
}

export type ScheduledTournament = {
  tournament: TournamentDoc & { id: string };
  matches: TournamentMatchDoc[];
};

export type ScheduleDay = {
  date: string;
  tournaments: ScheduledTournament[];
};

export function useTournamentSchedulesByDate() {
  const initialized = useAuthStore((s) => s.initialized);
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["tournament-schedules-by-date", tenantId],
    enabled: initialized,
    queryFn: async (): Promise<ScheduleDay[]> => {
      const tournamentsQ = query(
        collection(getClientDb(), "tournaments"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null),
        orderBy("title")
      );
      const matchesQ = query(
        collection(getClientDb(), "tournamentMatches"),
        where("tenantId", "==", tenantId),
        orderBy("scheduledStartAt")
      );

      const [tournamentsSnap, matchesSnap] = await Promise.all([
        getDocs(tournamentsQ),
        getDocs(matchesQ),
      ]);

      const tournaments = tournamentsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as TournamentDoc & { id: string }
      );

      const matchesByTournament = new Map<string, TournamentMatchDoc[]>();
      for (const matchDoc of matchesSnap.docs) {
        const match = {
          id: matchDoc.id,
          ...matchDoc.data(),
        } as TournamentMatchDoc;
        const existing = matchesByTournament.get(match.tournamentId) ?? [];
        existing.push(match);
        matchesByTournament.set(match.tournamentId, existing);
      }

      const byDate = new Map<string, ScheduleDay>();

      for (const tournament of tournaments) {
        const matches = (matchesByTournament.get(tournament.id) ?? []).sort(
          (a, b) => a.slotNumber - b.slotNumber
        );

        if (!byDate.has(tournament.date)) {
          byDate.set(tournament.date, { date: tournament.date, tournaments: [] });
        }
        byDate.get(tournament.date)!.tournaments.push({ tournament, matches });
      }

      return Array.from(byDate.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    },
  });
}

export type UpcomingTournamentGame = {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  scheduledStartAt: string;
  matchup: string;
};

export function useUpcomingTournamentGames(limit?: number) {
  const initialized = useAuthStore((s) => s.initialized);
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["upcoming-tournament-games", tenantId, limit],
    enabled: initialized,
    queryFn: async (): Promise<UpcomingTournamentGame[]> => {
      const tournamentsQ = query(
        collection(getClientDb(), "tournaments"),
        where("tenantId", "==", tenantId),
        where("deletedAt", "==", null),
        orderBy("title")
      );
      const matchesQ = query(
        collection(getClientDb(), "tournamentMatches"),
        where("tenantId", "==", tenantId),
        orderBy("scheduledStartAt")
      );

      const [tournamentsSnap, matchesSnap] = await Promise.all([
        getDocs(tournamentsQ),
        getDocs(matchesQ),
      ]);

      if (tournamentsSnap.empty) return [];

      const tournamentMap = new Map(
        tournamentsSnap.docs.map((d) => {
          const data = d.data() as TournamentDoc;
          return [d.id, data.title];
        })
      );

      const now = Date.now();
      const games = matchesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as TournamentMatchDoc)
        .filter(
          (match) =>
            tournamentMap.has(match.tournamentId) &&
            match.status !== "completed" &&
            match.status !== "cancelled" &&
            new Date(match.scheduledStartAt).getTime() >= now
        )
        .sort((a, b) =>
          a.scheduledStartAt.localeCompare(b.scheduledStartAt)
        )
        .map((match) => ({
          id: match.id,
          tournamentId: match.tournamentId,
          tournamentTitle:
            tournamentMap.get(match.tournamentId) ?? "Tournament",
          scheduledStartAt: match.scheduledStartAt,
          matchup: formatMatchupLabel(match),
        }));

      return limit != null ? games.slice(0, limit) : games;
    },
  });
}

export { useCanWriteTournaments } from "@/hooks/use-permissions";

export type TeamTournamentMatch = TournamentMatchDoc & {
  tournamentTitle: string;
  tournamentDate: string;
};

export function useTeamTournamentMatches(teamId?: string) {
  const initialized = useAuthStore((s) => s.initialized);
  const tenantId = useAuthStore((s) => s.user?.tenantId) ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ["team-tournament-matches", tenantId, teamId],
    enabled: initialized && !!teamId,
    queryFn: async (): Promise<TeamTournamentMatch[]> => {
      const matchesQ = query(
        collection(getClientDb(), "tournamentMatches"),
        where("tenantId", "==", tenantId),
        orderBy("scheduledStartAt")
      );

      const matchesSnap = await getDocs(matchesQ);

      const tournamentMap = new Map<string, { title: string; date: string }>();
      try {
        const tournamentsQ = query(
          collection(getClientDb(), "tournaments"),
          where("tenantId", "==", tenantId),
          where("deletedAt", "==", null),
          orderBy("title")
        );
        const tournamentsSnap = await getDocs(tournamentsQ);
        for (const d of tournamentsSnap.docs) {
          const data = d.data() as TournamentDoc;
          tournamentMap.set(d.id, { title: data.title, date: data.date });
        }
      } catch {
        // Coaches may lack tournaments:read; matches still load with fallback titles.
      }

      return matchesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as TournamentMatchDoc)
        .filter(
          (match) =>
            match.homeTeamId === teamId || match.awayTeamId === teamId
        )
        .map((match) => {
          const tournament = tournamentMap.get(match.tournamentId);
          return {
            ...match,
            tournamentTitle: tournament?.title ?? "Tournament",
            tournamentDate: tournament?.date ?? "",
          };
        })
        .sort((a, b) => a.scheduledStartAt.localeCompare(b.scheduledStartAt));
    },
  });
}
