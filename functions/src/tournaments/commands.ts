import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  baseDocumentFields,
  bumpDocument,
  createTournamentDraftSchema,
  PERMISSIONS,
  recordMatchResultSchema,
  tournamentIdSchema,
  updateTournamentSchema,
  type BaseDocument,
} from "@nbbl/shared";
import {
  getAuthContext,
  getDb,
  requirePermission,
  writeAuditLog,
} from "../lib/context";
import {
  collectBoxScoresByTeam,
  computeStandings,
  generateDemoScores,
  generateTournamentSchedule,
  loadPlayersByTeam,
  removePlayerStatsForTournament,
  simulatePlayerStats,
  simulateTeamStats,
  simulateTournamentMatches,
  resetTeamGameStats,
  syncPlayerStatsToSeedFile,
  syncTeamStatsToSeedFile,
  syncTournamentToSeedFile,
  type MatchResult,
  type SeedTournamentData,
  type TeamInfo,
} from "@nbbl/server";

const CIRCUIT1_SEASON_ID = "season_circuit1_2026";

async function loadTeamsForSeason(
  tenantId: string,
  seasonId: string
): Promise<TeamInfo[]> {
  const snap = await getDb()
    .collection("teams")
    .where("tenantId", "==", tenantId)
    .where("seasonId", "==", seasonId)
    .where("deletedAt", "==", null)
    .where("status", "==", "active")
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name as string,
      division: data.division as TeamInfo["division"],
    };
  });
}

async function deleteTournamentMatches(tournamentId: string): Promise<void> {
  const snap = await getDb()
    .collection("tournamentMatches")
    .where("tournamentId", "==", tournamentId)
    .get();

  const batch = getDb().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
}

async function deleteTournamentStandings(tournamentId: string): Promise<void> {
  const snap = await getDb()
    .collection("tournamentStandings")
    .where("tournamentId", "==", tournamentId)
    .get();

  const batch = getDb().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
}

async function tournamentHasCompletedMatches(
  tournamentId: string
): Promise<boolean> {
  const snap = await getDb()
    .collection("tournamentMatches")
    .where("tournamentId", "==", tournamentId)
    .where("status", "==", "completed")
    .limit(1)
    .get();
  return !snap.empty;
}

async function writeTournamentMatches(
  tournamentId: string,
  actorId: string,
  enterpriseId: string,
  tenantId: string,
  generated: ReturnType<typeof generateTournamentSchedule>,
  completeRoundRobin = false
): Promise<void> {
  const batch = getDb().batch();

  for (const match of generated.matches) {
    const id = getDb().collection("tournamentMatches").doc().id;
    const base = baseDocumentFields(id, actorId, enterpriseId, tenantId);

    const isRR = match.phase === "round_robin";
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    let winnerId: string | null = null;
    let status = "scheduled";

    if (completeRoundRobin && isRR && match.homeTeamId && match.awayTeamId) {
      const scores = generateDemoScores(
        match.homeTeamId,
        match.awayTeamId,
        match.slotNumber
      );
      homeScore = scores.homeScore;
      awayScore = scores.awayScore;
      winnerId = scores.winnerId;
      status = "completed";
    }

    batch.set(getDb().collection("tournamentMatches").doc(id), {
      ...base,
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
}

async function writeStandingsFromMatches(
  tournamentId: string,
  actorId: string,
  enterpriseId: string,
  tenantId: string,
  boysTeamIds: string[],
  girlsTeamIds: string[]
): Promise<void> {
  await deleteTournamentStandings(tournamentId);

  const matchesSnap = await getDb()
    .collection("tournamentMatches")
    .where("tournamentId", "==", tournamentId)
    .where("phase", "==", "round_robin")
    .where("status", "==", "completed")
    .get();

  const completed: MatchResult[] = matchesSnap.docs.map((d) => {
    const data = d.data();
    return {
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      homeScore: data.homeScore ?? 0,
      awayScore: data.awayScore ?? 0,
      winnerId: data.winnerId ?? null,
      division: data.division,
      phase: data.phase,
    };
  });

  const teamsSnap = await getDb()
    .collection("teams")
    .where("tenantId", "==", tenantId)
    .get();
  const teamMap = new Map(
    teamsSnap.docs.map((d) => [d.id, { id: d.id, name: d.data().name as string }])
  );

  const boysTeams = boysTeamIds
    .map((id) => teamMap.get(id))
    .filter(Boolean) as { id: string; name: string }[];
  const girlsTeams = girlsTeamIds
    .map((id) => teamMap.get(id))
    .filter(Boolean) as { id: string; name: string }[];

  const boysStandings = computeStandings(
    tournamentId,
    "Boys Division",
    boysTeams,
    completed
  );
  const girlsStandings = computeStandings(
    tournamentId,
    "Girls Division",
    girlsTeams,
    completed
  );

  const batch = getDb().batch();
  for (const standing of [...boysStandings, ...girlsStandings]) {
    const id = getDb().collection("tournamentStandings").doc().id;
    const base = baseDocumentFields(id, actorId, enterpriseId, tenantId);
    batch.set(getDb().collection("tournamentStandings").doc(id), {
      ...base,
      ...standing,
    });
  }
  await batch.commit();
}

function tournamentDocFromGenerated(
  id: string,
  actorId: string,
  enterpriseId: string,
  tenantId: string,
  generated: ReturnType<typeof generateTournamentSchedule>,
  status: "draft" | "active"
) {
  const base = baseDocumentFields(id, actorId, enterpriseId, tenantId);
  return {
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
    tournamentStatus: status,
  };
}

type TournamentScheduleInput = {
  title: string;
  date: string;
  startTime: string;
  timesEachTeamPlaysOthers: number;
  lunchBreakMinutes: number;
  seasonId: string;
};

async function regenerateTournamentSchedule(
  ctx: ReturnType<typeof getAuthContext>,
  tournamentId: string,
  doc: FirebaseFirestore.DocumentData,
  input: TournamentScheduleInput
) {
  const teams = await loadTeamsForSeason(ctx.tenantId, input.seasonId);
  const generated = generateTournamentSchedule(input, teams, input.seasonId);

  await deleteTournamentMatches(tournamentId);
  await deleteTournamentStandings(tournamentId);

  const wasActive = doc.tournamentStatus === "active";
  await writeTournamentMatches(
    tournamentId,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    generated,
    wasActive
  );

  if (wasActive) {
    await writeStandingsFromMatches(
      tournamentId,
      ctx.uid,
      ctx.enterpriseId,
      ctx.tenantId,
      generated.boysTeamIds,
      generated.girlsTeamIds
    );
  }

  const docUpdates = {
    title: generated.config.title,
    date: generated.config.date,
    startTime: generated.config.startTime,
    timesEachTeamPlaysOthers: generated.config.timesEachTeamPlaysOthers,
    lunchBreakMinutes: generated.config.lunchBreakMinutes,
    breakAfterGame: generated.breakAfterGame,
    totalGames: generated.totalGames,
    rrTotal: generated.rrTotal,
    boysTeamIds: generated.boysTeamIds,
    girlsTeamIds: generated.girlsTeamIds,
  };

  const updated = bumpDocument(
    doc as BaseDocument,
    ctx.uid,
    docUpdates as Partial<BaseDocument>
  );

  await getDb()
    .collection("tournaments")
    .doc(tournamentId)
    .update({
      ...docUpdates,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
      version: updated.version,
    });

  return {
    totalGames: generated.totalGames,
    breakAfterGame: generated.breakAfterGame,
  };
}

async function buildSeedData(tournamentId: string): Promise<SeedTournamentData> {
  const tSnap = await getDb().collection("tournaments").doc(tournamentId).get();
  if (!tSnap.exists) throw new HttpsError("not-found", "Tournament not found");
  const t = tSnap.data()!;

  const matchesSnap = await getDb()
    .collection("tournamentMatches")
    .where("tournamentId", "==", tournamentId)
    .orderBy("slotNumber")
    .get();

  return {
    id: tournamentId,
    title: t.title,
    date: t.date,
    startTime: t.startTime,
    timesEachTeamPlaysOthers: t.timesEachTeamPlaysOthers,
    lunchBreakMinutes: t.lunchBreakMinutes,
    breakAfterGame: t.breakAfterGame,
    totalGames: t.totalGames,
    seasonId: t.seasonId,
    facilityId: t.facilityId,
    courtId: t.courtId,
    status: t.tournamentStatus,
    boysTeamIds: t.boysTeamIds,
    girlsTeamIds: t.girlsTeamIds,
    matches: matchesSnap.docs.map((d) => {
      const m = d.data();
      return {
        division: m.division,
        phase: m.phase,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeTeamName: m.homeTeamName,
        awayTeamName: m.awayTeamName,
        slotNumber: m.slotNumber,
        scheduledStartAt: m.scheduledStartAt,
        scheduledEndAt: m.scheduledEndAt,
        status: m.status,
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

export const createTournamentDraft = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TOURNAMENTS_WRITE);

  const input = createTournamentDraftSchema.parse(request.data);
  const seasonId = input.seasonId ?? CIRCUIT1_SEASON_ID;
  const teams = await loadTeamsForSeason(ctx.tenantId, seasonId);

  const generated = generateTournamentSchedule(input, teams, seasonId);
  const tournamentId = getDb().collection("tournaments").doc().id;

  const doc = tournamentDocFromGenerated(
    tournamentId,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    generated,
    "draft"
  );

  await getDb().collection("tournaments").doc(tournamentId).set(doc);
  await writeTournamentMatches(
    tournamentId,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    generated
  );

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "tournament",
    entityId: tournamentId,
    action: "create_draft",
    summary: `Created draft tournament "${input.title}"`,
  });

  return {
    tournamentId,
    totalGames: generated.totalGames,
    breakAfterGame: generated.breakAfterGame,
  };
});

export const saveTournament = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TOURNAMENTS_WRITE);

  const { tournamentId } = tournamentIdSchema.parse(request.data);
  const ref = getDb().collection("tournaments").doc(tournamentId);
  const snap = await ref.get();

  if (!snap.exists) throw new HttpsError("not-found", "Tournament not found");
  const doc = snap.data() as BaseDocument & Record<string, unknown>;
  if (doc.tenantId !== ctx.tenantId) {
    throw new HttpsError("permission-denied", "Tournament not in your tenant");
  }

  const updated = bumpDocument(doc as BaseDocument, ctx.uid, {
    tournamentStatus: "active",
  } as Partial<BaseDocument>);

  await ref.update({
    ...updated,
    tournamentStatus: "active",
  });

  const seedData = await buildSeedData(tournamentId);
  const synced = syncTournamentToSeedFile(seedData);

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "tournament",
    entityId: tournamentId,
    action: "save",
    summary: `Saved tournament "${doc.title}"`,
    payload: { seedSynced: synced },
  });

  return { tournamentId, seedSynced: synced };
});

export const recalculateTournamentSchedule = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TOURNAMENTS_WRITE);

  const { tournamentId } = tournamentIdSchema.parse(request.data);
  const ref = getDb().collection("tournaments").doc(tournamentId);
  const snap = await ref.get();

  if (!snap.exists) throw new HttpsError("not-found", "Tournament not found");
  const doc = snap.data()!;
  if (doc.tenantId !== ctx.tenantId) {
    throw new HttpsError("permission-denied", "Tournament not in your tenant");
  }

  const result = await regenerateTournamentSchedule(ctx, tournamentId, doc, {
    title: doc.title,
    date: doc.date,
    startTime: doc.startTime,
    timesEachTeamPlaysOthers: doc.timesEachTeamPlaysOthers,
    lunchBreakMinutes: doc.lunchBreakMinutes,
    seasonId: doc.seasonId,
  });

  return { tournamentId, ...result };
});

export const updateTournament = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TOURNAMENTS_WRITE);

  const input = updateTournamentSchema.parse(request.data);
  const { tournamentId, ...fields } = input;
  const ref = getDb().collection("tournaments").doc(tournamentId);
  const snap = await ref.get();

  if (!snap.exists) throw new HttpsError("not-found", "Tournament not found");
  const doc = snap.data()!;
  if (doc.tenantId !== ctx.tenantId) {
    throw new HttpsError("permission-denied", "Tournament not in your tenant");
  }

  const seasonId = fields.seasonId ?? doc.seasonId;
  const result = await regenerateTournamentSchedule(ctx, tournamentId, doc, {
    ...fields,
    seasonId,
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "tournament",
    entityId: tournamentId,
    action: "update",
    summary: `Updated tournament "${fields.title}"`,
  });

  return { tournamentId, ...result };
});

export const deleteTournament = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TOURNAMENTS_WRITE);

  const { tournamentId } = tournamentIdSchema.parse(request.data);
  const ref = getDb().collection("tournaments").doc(tournamentId);
  const snap = await ref.get();

  if (!snap.exists) throw new HttpsError("not-found", "Tournament not found");
  const doc = snap.data()!;
  if (doc.tenantId !== ctx.tenantId) {
    throw new HttpsError("permission-denied", "Tournament not in your tenant");
  }

  const teamIds = [
    ...((doc.boysTeamIds as string[]) ?? []),
    ...((doc.girlsTeamIds as string[]) ?? []),
  ];
  const hadCompletedMatches = await tournamentHasCompletedMatches(tournamentId);

  await deleteTournamentMatches(tournamentId);
  await deleteTournamentStandings(tournamentId);

  const playersUpdated = await removePlayerStatsForTournament(
    getDb(),
    ctx.tenantId,
    ctx.uid,
    tournamentId,
    teamIds
  );

  if (playersUpdated > 0 || hadCompletedMatches) {
    await resetTeamGameStats(getDb(), teamIds, ctx.uid);
  }

  await ref.delete();

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "tournament",
    entityId: tournamentId,
    action: "delete",
    summary: `Deleted tournament "${doc.title}"`,
    payload: {
      playersStatsCleared: playersUpdated,
      teamStatsCleared: playersUpdated > 0 || hadCompletedMatches,
    },
  });

  return { tournamentId };
});

export const recordMatchResult = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TOURNAMENTS_WRITE);

  const input = recordMatchResultSchema.parse(request.data);
  const matchRef = getDb().collection("tournamentMatches").doc(input.matchId);
  const matchSnap = await matchRef.get();

  if (!matchSnap.exists) throw new HttpsError("not-found", "Match not found");
  const match = matchSnap.data()!;

  const tournamentId = match.tournamentId as string;
  const tSnap = await getDb().collection("tournaments").doc(tournamentId).get();
  if (!tSnap.exists) throw new HttpsError("not-found", "Tournament not found");
  const tournament = tSnap.data()!;

  if (tournament.tenantId !== ctx.tenantId) {
    throw new HttpsError("permission-denied", "Tournament not in your tenant");
  }

  const winnerId =
    input.homeScore > input.awayScore
      ? match.homeTeamId
      : input.awayScore > input.homeScore
        ? match.awayTeamId
        : null;

  await matchRef.update({
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    winnerId,
    status: "completed",
    updatedAt: new Date().toISOString(),
    updatedBy: ctx.uid,
  });

  if (match.phase === "round_robin") {
    await writeStandingsFromMatches(
      tournamentId,
      ctx.uid,
      ctx.enterpriseId,
      ctx.tenantId,
      tournament.boysTeamIds,
      tournament.girlsTeamIds
    );
  }

  return { matchId: input.matchId, winnerId };
});

export const simulateTournament = onCall(async (request) => {
  const ctx = getAuthContext(request.auth!);
  requirePermission(ctx, PERMISSIONS.TOURNAMENTS_WRITE);

  const { tournamentId } = tournamentIdSchema.parse(request.data);
  const ref = getDb().collection("tournaments").doc(tournamentId);
  const snap = await ref.get();

  if (!snap.exists) throw new HttpsError("not-found", "Tournament not found");
  const doc = snap.data()!;
  if (doc.tenantId !== ctx.tenantId) {
    throw new HttpsError("permission-denied", "Tournament not in your tenant");
  }

  const teamIds = [
    ...(doc.boysTeamIds as string[]),
    ...(doc.girlsTeamIds as string[]),
  ];

  const completedMatches = await simulateTournamentMatches(
    getDb(),
    tournamentId,
    ctx.uid,
    ctx.enterpriseId,
    ctx.tenantId,
    doc.boysTeamIds as string[],
    doc.girlsTeamIds as string[]
  );

  const playerStats = await simulatePlayerStats(
    getDb(),
    ctx.tenantId,
    ctx.uid,
    tournamentId,
    teamIds,
    completedMatches
  );

  const playersByTeam = await loadPlayersByTeam(
    getDb(),
    ctx.tenantId,
    teamIds
  );
  const boxScoresByTeam = collectBoxScoresByTeam(playerStats, playersByTeam);

  const teamStats = await simulateTeamStats(
    getDb(),
    ctx.uid,
    teamIds,
    completedMatches,
    boxScoresByTeam
  );

  const seedData = await buildSeedData(tournamentId);
  const tournamentSeedSynced = syncTournamentToSeedFile(seedData);
  const playerStatsRecord = Object.fromEntries(playerStats);
  const playerSeedSynced = syncPlayerStatsToSeedFile(playerStatsRecord);
  const teamSeedSynced = syncTeamStatsToSeedFile(teamStats);

  await writeAuditLog({
    tenantId: ctx.tenantId,
    enterpriseId: ctx.enterpriseId,
    actorId: ctx.uid,
    entityType: "tournament",
    entityId: tournamentId,
    action: "simulate",
    summary: `Simulated tournament "${doc.title}"`,
    payload: {
      matchesCompleted: completedMatches.length,
      playersUpdated: playerStats.size,
      teamsUpdated: teamIds.length,
      seedSynced: tournamentSeedSynced && playerSeedSynced && teamSeedSynced,
    },
  });

  return {
    tournamentId,
    matchesCompleted: completedMatches.length,
    playersUpdated: playerStats.size,
    teamsUpdated: teamIds.length,
    seedSynced: tournamentSeedSynced && playerSeedSynced && teamSeedSynced,
  };
});
