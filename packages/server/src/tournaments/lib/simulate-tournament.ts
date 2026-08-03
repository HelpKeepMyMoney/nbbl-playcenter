import type { Firestore } from "firebase-admin/firestore";
import type { Division } from "@nbbl/shared";
import { baseDocumentFields } from "@nbbl/shared";
import { generateDemoScores, computeStandings } from "./standings";

export interface SimulatedMatch {
  id: string;
  tournamentId: string;
  division: string;
  phase: string;
  slotNumber: number;
  scheduledStartAt: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  winnerId: string;
}

interface MatchDoc {
  id: string;
  division: string;
  phase: string;
  slotNumber: number;
  scheduledStartAt: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeSeed?: number | null;
  awaySeed?: number | null;
  playoffRound?: number | null;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerId?: string | null;
}

function applyScores(
  homeTeamId: string,
  awayTeamId: string,
  slotNumber: number
) {
  const scores = generateDemoScores(homeTeamId, awayTeamId, slotNumber);
  return {
    homeScore: scores.homeScore,
    awayScore: scores.awayScore,
    winnerId: scores.winnerId,
    status: "completed",
  };
}

async function resetTournamentMatches(
  db: Firestore,
  tournamentId: string
): Promise<MatchDoc[]> {
  const snap = await db
    .collection("tournamentMatches")
    .where("tournamentId", "==", tournamentId)
    .get();

  const matches: MatchDoc[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      division: data.division as string,
      phase: data.phase as string,
      slotNumber: data.slotNumber as number,
      scheduledStartAt: data.scheduledStartAt as string,
      homeTeamId: (data.homeTeamId as string | null) ?? null,
      awayTeamId: (data.awayTeamId as string | null) ?? null,
      homeTeamName: data.homeTeamName as string,
      awayTeamName: data.awayTeamName as string,
      homeSeed: (data.homeSeed as number | null) ?? null,
      awaySeed: (data.awaySeed as number | null) ?? null,
      playoffRound: (data.playoffRound as number | null) ?? null,
      status: data.status as string,
      homeScore: (data.homeScore as number | null) ?? null,
      awayScore: (data.awayScore as number | null) ?? null,
      winnerId: (data.winnerId as string | null) ?? null,
    };
  });

  const batch = db.batch();
  for (const match of matches) {
    const isRR = match.phase === "round_robin";
    batch.update(db.collection("tournamentMatches").doc(match.id), {
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      winnerId: null,
      ...(isRR
        ? {}
        : {
            homeTeamId: null,
            awayTeamId: null,
            homeTeamName:
              match.phase === "championship"
                ? "TBD"
                : match.homeSeed != null
                  ? `Seed #${match.homeSeed}`
                  : "TBD",
            awayTeamName:
              match.phase === "championship"
                ? "TBD"
                : match.awaySeed != null
                  ? `Seed #${match.awaySeed}`
                  : "TBD",
          }),
    });
    match.status = "scheduled";
    match.homeScore = null;
    match.awayScore = null;
    match.winnerId = null;
    if (!isRR) {
      match.homeTeamId = null;
      match.awayTeamId = null;
    }
  }
  if (!matches.length) return [];
  await batch.commit();
  return matches.sort((a, b) => a.slotNumber - b.slotNumber);
}

async function writeStandings(
  db: Firestore,
  tournamentId: string,
  actorId: string,
  enterpriseId: string,
  tenantId: string,
  boysTeamIds: string[],
  girlsTeamIds: string[]
) {
  const standingsSnap = await db
    .collection("tournamentStandings")
    .where("tournamentId", "==", tournamentId)
    .get();
  const deleteBatch = db.batch();
  standingsSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
  if (!standingsSnap.empty) await deleteBatch.commit();

  const matchesSnap = await db
    .collection("tournamentMatches")
    .where("tournamentId", "==", tournamentId)
    .where("phase", "==", "round_robin")
    .where("status", "==", "completed")
    .get();

  const completed = matchesSnap.docs.map((d) => {
    const data = d.data();
    return {
      homeTeamId: data.homeTeamId as string,
      awayTeamId: data.awayTeamId as string,
      homeScore: (data.homeScore as number) ?? 0,
      awayScore: (data.awayScore as number) ?? 0,
      winnerId: (data.winnerId as string | null) ?? null,
      division: data.division as Division,
      phase: data.phase as string,
    };
  });

  const teamsSnap = await db
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

  const standings = [
    ...computeStandings(tournamentId, "Boys Division", boysTeams, completed),
    ...computeStandings(tournamentId, "Girls Division", girlsTeams, completed),
  ];

  const batch = db.batch();
  for (const standing of standings) {
    const id = db.collection("tournamentStandings").doc().id;
    const base = baseDocumentFields(id, actorId, enterpriseId, tenantId);
    batch.set(db.collection("tournamentStandings").doc(id), {
      ...base,
      ...standing,
    });
  }
  await batch.commit();

  return standings;
}

async function completeMatch(
  db: Firestore,
  match: MatchDoc,
  homeTeamId: string,
  awayTeamId: string,
  homeTeamName: string,
  awayTeamName: string,
  seeds?: { homeSeed: number; awaySeed: number }
): Promise<SimulatedMatch> {
  const scores = applyScores(homeTeamId, awayTeamId, match.slotNumber);
  await db.collection("tournamentMatches").doc(match.id).update({
    homeTeamId,
    awayTeamId,
    homeTeamName,
    awayTeamName,
    ...(seeds ? { homeSeed: seeds.homeSeed, awaySeed: seeds.awaySeed } : {}),
    ...scores,
  });
  match.homeTeamId = homeTeamId;
  match.awayTeamId = awayTeamId;
  match.homeTeamName = homeTeamName;
  match.awayTeamName = awayTeamName;
  if (seeds) {
    match.homeSeed = seeds.homeSeed;
    match.awaySeed = seeds.awaySeed;
  }
  match.homeScore = scores.homeScore;
  match.awayScore = scores.awayScore;
  match.winnerId = scores.winnerId;
  match.status = scores.status;

  return {
    id: match.id,
    tournamentId: "",
    division: match.division,
    phase: match.phase,
    slotNumber: match.slotNumber,
    scheduledStartAt: match.scheduledStartAt,
    homeTeamId,
    awayTeamId,
    homeTeamName,
    awayTeamName,
    homeScore: scores.homeScore,
    awayScore: scores.awayScore,
    winnerId: scores.winnerId,
  };
}

export async function simulateTournamentMatches(
  db: Firestore,
  tournamentId: string,
  actorId: string,
  enterpriseId: string,
  tenantId: string,
  boysTeamIds: string[],
  girlsTeamIds: string[]
): Promise<SimulatedMatch[]> {
  const matches = await resetTournamentMatches(db, tournamentId);
  const completed: SimulatedMatch[] = [];

  for (const match of matches) {
    if (match.phase !== "round_robin") continue;
    if (!match.homeTeamId || !match.awayTeamId) continue;
    const result = await completeMatch(
      db,
      match,
      match.homeTeamId,
      match.awayTeamId,
      match.homeTeamName,
      match.awayTeamName
    );
    result.tournamentId = tournamentId;
    completed.push(result);
  }

  await writeStandings(
    db,
    tournamentId,
    actorId,
    enterpriseId,
    tenantId,
    boysTeamIds,
    girlsTeamIds
  );

  return completed.sort((a, b) => a.slotNumber - b.slotNumber);
}
