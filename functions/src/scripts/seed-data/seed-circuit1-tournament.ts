import * as admin from "firebase-admin";
import { baseDocumentFields, DEFAULT_TENANT_ID, ENTERPRISE_ID } from "@nbbl/shared";
import {
  computeStandings,
  generateDemoScores,
  generateTournamentSchedule,
  type MatchResult,
} from "@nbbl/server";
import { CIRCUIT1_TEAMS, CIRCUIT1_SEASON_ID } from "./circuit1-ids";
import { CIRCUIT1_TOURNAMENTS } from "./circuit1-tournaments";
import type { SeedTournamentData } from "./circuit1-tournament-types";

export async function seedCircuit1Tournament(
  db: admin.firestore.Firestore,
  actorId: string
): Promise<void> {
  for (const tournament of CIRCUIT1_TOURNAMENTS) {
    const hasMatches = tournament.matches.length > 0;
    const matchesComplete =
      tournament.matches.length === tournament.totalGames;

    if (hasMatches && matchesComplete) {
      await seedFromExportedData(db, actorId, tournament);
    } else {
      await seedFromGenerator(db, actorId, tournament);
    }
  }
}

async function seedFromGenerator(
  db: admin.firestore.Firestore,
  actorId: string,
  config: SeedTournamentData
): Promise<void> {
  const tournamentId = config.id;
  const teams = CIRCUIT1_TEAMS.map((t) => ({
    id: t.id,
    name: t.name,
    division: t.division,
  }));

  const generated = generateTournamentSchedule(
    {
      title: config.title,
      date: config.date,
      startTime: config.startTime,
      timesEachTeamPlaysOthers: config.timesEachTeamPlaysOthers,
      lunchBreakMinutes: config.lunchBreakMinutes,
      seasonId: CIRCUIT1_SEASON_ID,
    },
    teams,
    CIRCUIT1_SEASON_ID
  );

  const base = baseDocumentFields(
    tournamentId,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );

  await db.collection("tournaments").doc(tournamentId).set({
    ...base,
    title: generated.config.title,
    date: generated.config.date,
    startTime: generated.config.startTime,
    timesEachTeamPlaysOthers: generated.config.timesEachTeamPlaysOthers,
    lunchBreakMinutes: generated.config.lunchBreakMinutes,
    breakAfterGame: generated.breakAfterGame,
    totalGames: generated.totalGames,
    rrTotal: generated.rrTotal,
    seasonId: generated.config.seasonId,
    facilityId: generated.config.facilityId,
    courtId: generated.config.courtId,
    gameDurationMin: 7,
    slotIntervalMin: 10,
    boysTeamIds: generated.boysTeamIds,
    girlsTeamIds: generated.girlsTeamIds,
    tournamentStatus: "active",
  });

  const batch = db.batch();
  const completedRR: MatchResult[] = [];

  for (const match of generated.matches) {
    const id = db.collection("tournamentMatches").doc().id;
    const matchBase = baseDocumentFields(
      id,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    );

    const isRR = match.phase === "round_robin";
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    let winnerId: string | null = null;
    let status = "scheduled";

    if (isRR && match.homeTeamId && match.awayTeamId) {
      const scores = generateDemoScores(
        match.homeTeamId,
        match.awayTeamId,
        match.slotNumber
      );
      homeScore = scores.homeScore;
      awayScore = scores.awayScore;
      winnerId = scores.winnerId;
      status = "completed";
      completedRR.push({
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore,
        awayScore,
        winnerId,
        division: match.division,
        phase: match.phase,
      });
    }

    batch.set(db.collection("tournamentMatches").doc(id), {
      ...matchBase,
      tournamentId,
      division: match.division,
      phase: match.phase,
      cycle: match.cycle ?? null,
      round: match.round ?? null,
      playoffRound: match.playoffRound ?? null,
      homeTeamId: match.homeTeamId ?? null,
      awayTeamId: match.awayTeamId ?? null,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      homeSeed: match.homeSeed ?? null,
      awaySeed: match.awaySeed ?? null,
      slotNumber: match.slotNumber,
      scheduledStartAt: match.scheduledStartAt,
      scheduledEndAt: match.scheduledEndAt,
      status,
      homeScore,
      awayScore,
      winnerId,
    });
  }

  await batch.commit();

  const boysTeams = CIRCUIT1_TEAMS.filter((t) => t.division === "Boys Division").map(
    (t) => ({ id: t.id, name: t.name })
  );
  const girlsTeams = CIRCUIT1_TEAMS.filter(
    (t) => t.division === "Girls Division"
  ).map((t) => ({ id: t.id, name: t.name }));

  const boysStandings = computeStandings(
    tournamentId,
    "Boys Division",
    boysTeams,
    completedRR
  );
  const girlsStandings = computeStandings(
    tournamentId,
    "Girls Division",
    girlsTeams,
    completedRR
  );

  const standingsBatch = db.batch();
  for (const standing of [...boysStandings, ...girlsStandings]) {
    const id = db.collection("tournamentStandings").doc().id;
    const standingBase = baseDocumentFields(
      id,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    );
    standingsBatch.set(db.collection("tournamentStandings").doc(id), {
      ...standingBase,
      ...standing,
    });
  }
  await standingsBatch.commit();
}

async function seedFromExportedData(
  db: admin.firestore.Firestore,
  actorId: string,
  data: SeedTournamentData
): Promise<void> {
  const base = baseDocumentFields(
    data.id,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );

  await db.collection("tournaments").doc(data.id).set({
    ...base,
    title: data.title,
    date: data.date,
    startTime: data.startTime,
    timesEachTeamPlaysOthers: data.timesEachTeamPlaysOthers,
    lunchBreakMinutes: data.lunchBreakMinutes,
    breakAfterGame: data.breakAfterGame,
    totalGames: data.totalGames,
    rrTotal: data.matches.filter((m) => m.phase === "round_robin").length,
    seasonId: data.seasonId,
    facilityId: data.facilityId,
    courtId: data.courtId,
    gameDurationMin: 7,
    slotIntervalMin: 10,
    boysTeamIds: data.boysTeamIds,
    girlsTeamIds: data.girlsTeamIds,
    tournamentStatus: data.status,
  });

  const batch = db.batch();
  for (const match of data.matches) {
    const id = db.collection("tournamentMatches").doc().id;
    const matchBase = baseDocumentFields(
      id,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    );
    batch.set(db.collection("tournamentMatches").doc(id), {
      ...matchBase,
      tournamentId: data.id,
      division: match.division,
      phase: match.phase,
      cycle: match.cycle ?? null,
      round: match.round ?? null,
      playoffRound: match.playoffRound ?? null,
      homeTeamId: match.homeTeamId ?? null,
      awayTeamId: match.awayTeamId ?? null,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      homeSeed: match.homeSeed ?? null,
      awaySeed: match.awaySeed ?? null,
      slotNumber: match.slotNumber,
      scheduledStartAt: match.scheduledStartAt,
      scheduledEndAt: match.scheduledEndAt,
      status: match.status,
      homeScore: match.homeScore ?? null,
      awayScore: match.awayScore ?? null,
      winnerId: match.winnerId ?? null,
    });
  }
  await batch.commit();

  const completedRR: MatchResult[] = data.matches
    .filter(
      (m) =>
        m.phase === "round_robin" &&
        m.status === "completed" &&
        m.homeTeamId &&
        m.awayTeamId
    )
    .map((m) => ({
      homeTeamId: m.homeTeamId!,
      awayTeamId: m.awayTeamId!,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
      winnerId: m.winnerId ?? null,
      division: m.division as MatchResult["division"],
      phase: m.phase,
    }));

  const boysTeams = CIRCUIT1_TEAMS.filter((t) => t.division === "Boys Division").map(
    (t) => ({ id: t.id, name: t.name })
  );
  const girlsTeams = CIRCUIT1_TEAMS.filter(
    (t) => t.division === "Girls Division"
  ).map((t) => ({ id: t.id, name: t.name }));

  const boysStandings = computeStandings(
    data.id,
    "Boys Division",
    boysTeams,
    completedRR
  );
  const girlsStandings = computeStandings(
    data.id,
    "Girls Division",
    girlsTeams,
    completedRR
  );

  const standingsBatch = db.batch();
  for (const standing of [...boysStandings, ...girlsStandings]) {
    const id = db.collection("tournamentStandings").doc().id;
    const standingBase = baseDocumentFields(
      id,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    );
    standingsBatch.set(db.collection("tournamentStandings").doc(id), {
      ...standingBase,
      ...standing,
    });
  }
  await standingsBatch.commit();
}
