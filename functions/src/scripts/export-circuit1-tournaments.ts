import * as admin from "firebase-admin";
import type { SeedTournamentData } from "./seed-data/circuit1-tournament-types";
import { writeTournamentsSeedFile } from "../tournaments/lib/seed-export";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "demo-playcenter";

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

async function buildSeedData(tournamentId: string): Promise<SeedTournamentData> {
  const tSnap = await db.collection("tournaments").doc(tournamentId).get();
  if (!tSnap.exists) throw new Error(`Tournament not found: ${tournamentId}`);
  const t = tSnap.data()!;

  const matchesSnap = await db
    .collection("tournamentMatches")
    .where("tournamentId", "==", tournamentId)
    .orderBy("slotNumber")
    .get();

  return {
    id: tournamentId,
    title: t.title as string,
    date: t.date as string,
    startTime: t.startTime as string,
    timesEachTeamPlaysOthers: t.timesEachTeamPlaysOthers as number,
    lunchBreakMinutes: t.lunchBreakMinutes as number,
    breakAfterGame: t.breakAfterGame as number,
    totalGames: t.totalGames as number,
    seasonId: t.seasonId as string,
    facilityId: t.facilityId as string,
    courtId: t.courtId as string,
    status: t.tournamentStatus as string,
    boysTeamIds: t.boysTeamIds as string[],
    girlsTeamIds: t.girlsTeamIds as string[],
    matches: matchesSnap.docs.map((d) => {
      const m = d.data();
      return {
        division: m.division as string,
        phase: m.phase as string,
        homeTeamId: (m.homeTeamId as string | null) ?? null,
        awayTeamId: (m.awayTeamId as string | null) ?? null,
        homeTeamName: m.homeTeamName as string,
        awayTeamName: m.awayTeamName as string,
        slotNumber: m.slotNumber as number,
        scheduledStartAt: m.scheduledStartAt as string,
        scheduledEndAt: m.scheduledEndAt as string,
        status: m.status as string,
        cycle: m.cycle ?? undefined,
        round: m.round ?? undefined,
        playoffRound: m.playoffRound ?? undefined,
        homeSeed: m.homeSeed ?? undefined,
        awaySeed: m.awaySeed ?? undefined,
        homeScore: m.homeScore ?? undefined,
        awayScore: m.awayScore ?? undefined,
        winnerId: m.winnerId ?? undefined,
      };
    }),
  };
}

async function main() {
  const snap = await db
    .collection("tournaments")
    .where("deletedAt", "==", null)
    .get();

  const tournaments: SeedTournamentData[] = [];
  for (const doc of snap.docs) {
    tournaments.push(await buildSeedData(doc.id));
  }

  tournaments.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
  );

  writeTournamentsSeedFile(tournaments);
  console.log(`Exported ${tournaments.length} tournaments`);
  for (const t of tournaments) {
    console.log(` - ${t.date} ${t.title} (${t.matches.length} matches)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
