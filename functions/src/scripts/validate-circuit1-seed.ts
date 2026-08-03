import * as admin from "firebase-admin";
import { DEFAULT_TENANT_ID } from "@nbbl/shared";
import {
  CIRCUIT1_FACILITY_ID,
  CIRCUIT1_ORG_ID,
  CIRCUIT1_TEAMS,
  staffId,
} from "./seed-data/circuit1";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "demo-playcenter";

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

function fail(msg: string): void {
  console.error(`VALIDATION FAILED: ${msg}`);
  process.exit(1);
}

async function main() {
  console.log("Validating Circuit 1 seed data...");

  const orgSnap = await db
    .collection("organizations")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .get();
  if (orgSnap.size !== 1) fail(`Expected 1 organization, got ${orgSnap.size}`);

  const facilities = await db
    .collection("facilities")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .get();
  if (facilities.size !== 1) fail(`Expected 1 facility, got ${facilities.size}`);

  const binodes = await db
    .collection("binodes")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .get();
  if (binodes.size !== 1) fail(`Expected 1 binode, got ${binodes.size}`);

  const teamsSnap = await db
    .collection("teams")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("deletedAt", "==", null)
    .get();
  if (teamsSnap.size !== 8) fail(`Expected 8 teams, got ${teamsSnap.size}`);

  const teamNames = new Set<string>();
  for (const doc of teamsSnap.docs) {
    const d = doc.data();
    if (d.status !== "active") fail(`Team ${doc.id} not active`);
    teamNames.add(d.name as string);
    if (d.organizationId !== CIRCUIT1_ORG_ID) fail(`Team org ref invalid`);
    if (d.homeFacilityId !== CIRCUIT1_FACILITY_ID) fail(`Team facility ref invalid`);
    if (d.homeBinodeId !== "PHX-01") fail(`Team binode invalid`);
    if (d.playerCount !== 8) fail(`Team ${doc.id} playerCount !== 8`);
  }
  if (teamNames.size !== 8) fail("Duplicate team names");

  const playersSnap = await db
    .collection("participants")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("type", "==", "player")
    .where("deletedAt", "==", null)
    .get();
  if (playersSnap.size !== 64) fail(`Expected 64 players, got ${playersSnap.size}`);

  let boys = 0;
  let girls = 0;
  const playerNames = new Set<string>();
  const avatarUrls = new Set<string>();

  const allParticipants = await db
    .collection("participants")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("deletedAt", "==", null)
    .get();

  if (allParticipants.size !== 88) {
    fail(`Expected 88 total participants, got ${allParticipants.size}`);
  }

  for (const doc of allParticipants.docs) {
    const d = doc.data();
    if (d.status !== "active") fail(`Participant ${doc.id} not active`);
    const url = d.avatarUrl as string | undefined;
    if (!url?.startsWith("https://")) {
      fail(`Participant ${doc.id} missing https avatarUrl`);
    }
    if (url!.includes("/api/participants/")) {
      fail(`Participant ${doc.id} uses SVG avatar API`);
    }
    if (avatarUrls.has(url!)) fail(`Duplicate avatarUrl: ${url}`);
    avatarUrls.add(url!);
  }

  for (const doc of playersSnap.docs) {
    const d = doc.data();
    const name = `${d.firstName} ${d.lastName}`;
    if (playerNames.has(name)) fail(`Duplicate player name ${name}`);
    playerNames.add(name);
    if (d.gender === "male") boys++;
    if (d.gender === "female") girls++;
  }
  if (boys !== 32) fail(`Expected 32 boys, got ${boys}`);
  if (girls !== 32) fail(`Expected 32 girls, got ${girls}`);

  const hcIds = new Set<string>();
  let acCount = 0;
  let tmCount = 0;
  for (const team of CIRCUIT1_TEAMS) {
    const teamDoc = teamsSnap.docs.find((d) => d.id === team.id);
    if (!teamDoc) fail(`Missing team ${team.id}`);
    const td = teamDoc!.data();
    const hcId = staffId("hc", team.slug);
    if (td.headCoachParticipantId !== hcId) {
      fail(`Head coach mismatch on ${team.id}`);
    }
    hcIds.add(hcId);
  }

  const memberships = await db
    .collection("memberships")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("deletedAt", "==", null)
    .get();

  const playerTeamMap = new Map<string, string>();
  for (const m of memberships.docs) {
    const d = m.data();
    if (d.role === "player") {
      const existing = playerTeamMap.get(d.participantId as string);
      if (existing) fail(`Player on multiple teams: ${d.participantId}`);
      playerTeamMap.set(d.participantId as string, d.teamId as string);
    }
    if (d.role === "coach" && (m.id as string).includes("_ac_")) acCount++;
    if (d.role === "manager") tmCount++;
  }

  if (playerTeamMap.size !== 64) {
    fail(`Expected 64 player memberships, got ${playerTeamMap.size}`);
  }

  const playerMembershipsPerTeam = new Map<string, number>();
  for (const m of memberships.docs) {
    const d = m.data();
    if (d.role !== "player") continue;
    const tid = d.teamId as string;
    playerMembershipsPerTeam.set(tid, (playerMembershipsPerTeam.get(tid) ?? 0) + 1);
  }
  for (const team of CIRCUIT1_TEAMS) {
    const n = playerMembershipsPerTeam.get(team.id) ?? 0;
    if (n !== 8) fail(`Team ${team.id} has ${n} players, expected 8`);
  }

  if (hcIds.size !== 8) fail(`Expected 8 head coaches, got ${hcIds.size}`);
  if (acCount !== 8) fail(`Expected 8 assistant coach memberships, got ${acCount}`);
  if (tmCount !== 8) fail(`Expected 8 team manager memberships, got ${tmCount}`);

  const dash = await db
    .collection("tenants")
    .doc(DEFAULT_TENANT_ID)
    .collection("stats")
    .doc("dashboard")
    .get();
  if (!dash.exists) fail("Missing dashboard stats doc");
  const dashData = dash.data()!;
  if (dashData.participantPlayers !== 64) fail("Dashboard participantPlayers !== 64");
  if (dashData.teams !== 8) fail("Dashboard teams !== 8");
  if (dashData.totalRevenue !== 8000) fail("Dashboard totalRevenue !== 8000");
  if (dashData.activeMemberships !== 64) fail("Dashboard activeMemberships !== 64");

  const plansSnap = await db
    .collection("membershipPlans")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("deletedAt", "==", null)
    .get();
  if (plansSnap.size < 1) fail("Expected at least 1 membership plan");

  const playerMembershipsSnap = await db
    .collection("playerMemberships")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("deletedAt", "==", null)
    .get();
  if (playerMembershipsSnap.size !== 64) {
    fail(`Expected 64 player memberships, got ${playerMembershipsSnap.size}`);
  }

  let activePlayerMemberships = 0;
  for (const doc of playerMembershipsSnap.docs) {
    const d = doc.data();
    if (d.status === "active") activePlayerMemberships++;
    if (d.monthlyAmount !== 125) fail(`Player membership ${doc.id} amount !== 125`);
    if (d.effectiveDate !== "2026-08-01") {
      fail(`Player membership ${doc.id} effectiveDate !== 2026-08-01`);
    }
  }
  if (activePlayerMemberships !== 64) {
    fail(`Expected 64 active player memberships, got ${activePlayerMemberships}`);
  }

  const samplePlayer = playersSnap.docs[0];
  const sampleMembership = memberships.docs.find(
    (m) => m.data().participantId === samplePlayer.id && m.data().role === "player"
  );
  if (!sampleMembership) fail("Sample player membership missing");
  const membershipData = sampleMembership!.data();
  const sampleTeam = await db
    .collection("teams")
    .doc(membershipData.teamId as string)
    .get();
  const sampleParticipant = samplePlayer.data();
  if (sampleTeam.id !== sampleParticipant.currentTeamId) {
    fail("Player currentTeamId does not match membership team");
  }

  console.log("All Circuit 1 seed validations passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
