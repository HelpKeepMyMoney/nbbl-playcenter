import * as admin from "firebase-admin";
import {
  baseDocumentFields,
  DEFAULT_TENANT_ID,
  ENTERPRISE_ID,
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_PERMISSIONS,
} from "@nbbl/shared";
import {
  CIRCUIT1_AGE_GROUP_ID,
  CIRCUIT1_BINODE_ID,
  CIRCUIT1_COURT_ID,
  CIRCUIT1_FACILITY_ID,
  CIRCUIT1_ORG_ID,
  CIRCUIT1_PEOPLE,
  CIRCUIT1_PLAYER_STATS,
  CIRCUIT1_SEASON_ID,
  CIRCUIT1_TEAM_STATS,
  CIRCUIT1_TEAMS,
  getPersonById,
  staffId,
  teamLogoUrl,
  type Circuit1Person,
} from "./seed-data/circuit1";
import { seedCircuit1Tournament } from "./seed-data/seed-circuit1-tournament";
import { buildCircuit1SimulationStats } from "./seed-data/build-circuit1-simulation-stats";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "demo-playcenter";
const ADMIN_EMAIL = "admin@nbbl.local";
const ADMIN_PASSWORD = "PlayCenter123!";
const PLAYER_EMAIL = "marcus.allen@nbbl.local";
const PLAYER_PASSWORD = "PlayCenter123!";
const PLAYER_PARTICIPANT_ID = "player_storm_01";
const PLAYER_TEAM_ID = "team_boys_phoenix_storm";
const COACH_EMAIL = "anthony.ray@nbbl.local";
const COACH_PASSWORD = "PlayCenter123!";
const COACH_PARTICIPANT_ID = "coach_hc_storm";
const COACH_TEAM_ID = "team_boys_phoenix_storm";
const FAN_EMAIL = "fan@nbbl.local";
const FAN_PASSWORD = "PlayCenter123!";

const isRemoteSeed = process.env.SEED_TARGET === "remote";

if (!isRemoteSeed) {
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

const WIPE_COLLECTIONS = [
  "participants",
  "teams",
  "memberships",
  "organizations",
  "facilities",
  "binodes",
  "courts",
  "ageGroups",
  "seasons",
  "evaluations",
  "developmentPlans",
  "attendance",
  "events",
  "communications",
  "notifications",
  "reports",
  "auditLogs",
  "tournaments",
  "tournamentMatches",
  "tournamentStandings",
  "membershipPlans",
  "playerMemberships",
] as const;

async function deleteQueryBatch(
  query: admin.firestore.Query,
  batchSize = 400
): Promise<void> {
  const snap = await query.limit(batchSize).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  if (snap.size >= batchSize) {
    await deleteQueryBatch(query, batchSize);
  }
}

async function wipeTenantSeedData(): Promise<void> {
  console.log("Wiping tenant seed data...");
  for (const name of WIPE_COLLECTIONS) {
    await deleteQueryBatch(
      db.collection(name).where("tenantId", "==", DEFAULT_TENANT_ID)
    );
  }
  const statsSnap = await db
    .collection("tenants")
    .doc(DEFAULT_TENANT_ID)
    .collection("stats")
    .get();
  const batch = db.batch();
  statsSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function seedRoles() {
  for (const [roleKey, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await db.collection("roles").doc(roleKey).set({
      id: roleKey,
      enterpriseId: ENTERPRISE_ID,
      tenantId: DEFAULT_TENANT_ID,
      roleKey,
      permissionKeys: permissions,
      name: roleKey.replace("_", " "),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
      version: 1,
    });
  }

  for (const perm of Object.values(PERMISSIONS)) {
    await db.collection("permissions").doc(perm.replace(":", "_")).set({
      id: perm,
      key: perm,
      name: perm,
      createdAt: new Date().toISOString(),
      status: "active",
    });
  }
}

async function seedAdminUser() {
  let user;
  try {
    user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  } catch {
    user = await admin.auth().createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: "Jason Miller",
    });
  }

  const permissionKeys = ROLE_PERMISSIONS.league_admin;
  await admin.auth().setCustomUserClaims(user.uid, {
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    roleKeys: [ROLE_KEYS.LEAGUE_ADMIN],
    permissionKeys,
  });

  await db.collection("users").doc(user.uid).set({
    id: user.uid,
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    email: ADMIN_EMAIL,
    displayName: "Jason Miller",
    title: "League Director",
    roleKeys: [ROLE_KEYS.LEAGUE_ADMIN],
    permissionKeys,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    version: 1,
  });

  return user.uid;
}

async function seedPlayerUser() {
  let user;
  try {
    user = await admin.auth().getUserByEmail(PLAYER_EMAIL);
  } catch {
    user = await admin.auth().createUser({
      email: PLAYER_EMAIL,
      password: PLAYER_PASSWORD,
      displayName: "Marcus Allen",
    });
  }

  const permissionKeys = ROLE_PERMISSIONS.player;
  await admin.auth().setCustomUserClaims(user.uid, {
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    roleKeys: [ROLE_KEYS.PLAYER],
    permissionKeys,
  });

  await db.collection("users").doc(user.uid).set({
    id: user.uid,
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    email: PLAYER_EMAIL,
    displayName: "Marcus Allen",
    title: "Player",
    roleKeys: [ROLE_KEYS.PLAYER],
    permissionKeys,
    participantId: PLAYER_PARTICIPANT_ID,
    teamId: PLAYER_TEAM_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    version: 1,
  });

  return user.uid;
}

async function seedCoachUser() {
  let user;
  try {
    user = await admin.auth().getUserByEmail(COACH_EMAIL);
  } catch {
    user = await admin.auth().createUser({
      email: COACH_EMAIL,
      password: COACH_PASSWORD,
      displayName: "Anthony Ray",
    });
  }

  const permissionKeys = ROLE_PERMISSIONS.coach;
  await admin.auth().setCustomUserClaims(user.uid, {
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    roleKeys: [ROLE_KEYS.COACH],
    permissionKeys,
  });

  await db.collection("users").doc(user.uid).set({
    id: user.uid,
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    email: COACH_EMAIL,
    displayName: "Anthony Ray",
    title: "Head Coach",
    roleKeys: [ROLE_KEYS.COACH],
    permissionKeys,
    participantId: COACH_PARTICIPANT_ID,
    teamId: COACH_TEAM_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    version: 1,
  });

  return user.uid;
}

async function seedFanUser() {
  let user;
  try {
    user = await admin.auth().getUserByEmail(FAN_EMAIL);
  } catch {
    user = await admin.auth().createUser({
      email: FAN_EMAIL,
      password: FAN_PASSWORD,
      displayName: "Jordan Lee",
    });
  }

  const permissionKeys = ROLE_PERMISSIONS.fan;
  await admin.auth().setCustomUserClaims(user.uid, {
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    roleKeys: [ROLE_KEYS.FAN],
    permissionKeys,
  });

  await db.collection("users").doc(user.uid).set({
    id: user.uid,
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    email: FAN_EMAIL,
    displayName: "Jordan Lee",
    title: "Fan",
    roleKeys: [ROLE_KEYS.FAN],
    permissionKeys,
    favoriteTeamIds: [PLAYER_TEAM_ID],
    favoriteParticipantIds: [PLAYER_PARTICIPANT_ID],
    favoriteVideoIds: ["highlights", "full-games"],
    interestedMerchIds: ["jerseys", "collectibles"],
    purchasedMerchIds: ["apparel"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    version: 1,
  });

  return user.uid;
}

async function seedOrganization(actorId: string) {
  const base = baseDocumentFields(
    CIRCUIT1_ORG_ID,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  await db.collection("organizations").doc(CIRCUIT1_ORG_ID).set({
    ...base,
    name: "Anthony Ray Recruiting Academy",
    organizationType: "Basketball Academy",
  });
}

async function seedFacility(actorId: string) {
  const base = baseDocumentFields(
    CIRCUIT1_FACILITY_ID,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  await db.collection("facilities").doc(CIRCUIT1_FACILITY_ID).set({
    ...base,
    name: "NBBL Academy",
    code: "PHX-01",
    displayName: "NBBL Academy — PHX-01",
    city: "Phoenix",
    state: "Arizona",
    country: "United States",
    binodeId: CIRCUIT1_BINODE_ID,
  });
}

async function seedBinode(actorId: string) {
  const base = baseDocumentFields(
    CIRCUIT1_BINODE_ID,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  await db.collection("binodes").doc(CIRCUIT1_BINODE_ID).set({
    ...base,
    code: "PHX-01",
    displayName: "NBBL Academy — PHX-01",
    facilityId: CIRCUIT1_FACILITY_ID,
    facilityName: "NBBL Academy",
  });
}

async function seedCourt(actorId: string) {
  const base = baseDocumentFields(
    CIRCUIT1_COURT_ID,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  await db.collection("courts").doc(CIRCUIT1_COURT_ID).set({
    ...base,
    name: "Main Court",
    facilityId: CIRCUIT1_FACILITY_ID,
  });
}

async function seedAgeGroup(actorId: string) {
  const base = baseDocumentFields(
    CIRCUIT1_AGE_GROUP_ID,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  await db.collection("ageGroups").doc(CIRCUIT1_AGE_GROUP_ID).set({
    ...base,
    name: "High School",
  });
}

async function seedSeason(actorId: string) {
  const base = baseDocumentFields(
    CIRCUIT1_SEASON_ID,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  await db.collection("seasons").doc(CIRCUIT1_SEASON_ID).set({
    ...base,
    name: "NBBL Circuit 1 — Inaugural Season",
    label: "Circuit 1 2026",
  });
}

function participantDoc(actorId: string, person: Circuit1Person) {
  const base = baseDocumentFields(
    person.id,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  const team = CIRCUIT1_TEAMS.find((t) => t.slug === person.teamSlug)!;
  return {
    ...base,
    type: person.type,
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    phone: person.phone,
    avatarUrl: person.headshotUrl,
    organizationId: CIRCUIT1_ORG_ID,
    tags: person.tags ?? [],
    dateOfBirth: person.dateOfBirth ?? null,
    gender: person.gender,
    nbblId: person.nbblId ?? null,
    height: person.height ?? null,
    weight: person.weight ?? null,
    primaryPosition: person.primaryPosition ?? null,
    secondaryPosition: person.secondaryPosition ?? null,
    jerseyNumber: person.jerseyNumber ?? null,
    graduationYear: person.graduationYear ?? null,
    address: person.address ?? null,
    parentGuardian: person.parentGuardian ?? null,
    emergencyContact: person.emergencyContact ?? null,
    school: person.school ?? null,
    bio: person.bio ?? null,
    dominantHand: person.dominantHand ?? null,
    memberSince: person.memberSince ?? null,
    attendancePct: person.attendancePct ?? null,
    overallRating: person.overallRating ?? null,
    developmentRating: person.developmentRating ?? null,
    basketballIQ: person.basketballIQ ?? null,
    leadershipRating: person.leadershipRating ?? null,
    athleticismRating: person.athleticismRating ?? null,
    shootingRating: person.shootingRating ?? null,
    defenseRating: person.defenseRating ?? null,
    ballHandlingRating: person.ballHandlingRating ?? null,
    strengthRating: person.strengthRating ?? null,
    division: team.division,
    ageGroupId: CIRCUIT1_AGE_GROUP_ID,
    ageGroup: "High School",
    homeFacilityId: CIRCUIT1_FACILITY_ID,
    homeFacilityName: "NBBL Academy — PHX-01",
    currentTeamId: CIRCUIT1_TEAMS.find((t) => t.slug === person.teamSlug)?.id,
    staffRole: person.staffRole ?? null,
    ...(person.type === "player" && CIRCUIT1_PLAYER_STATS[person.id]
      ? {
          gameSeasonStats: CIRCUIT1_PLAYER_STATS[person.id].gameSeasonStats,
          gameLog: CIRCUIT1_PLAYER_STATS[person.id].gameLog,
        }
      : person.type === "player"
        ? {
            gameSeasonStats: {
              gamesPlayed: 0,
              pointsPerGame: 0,
              reboundsPerGame: 0,
              assistsPerGame: 0,
            },
            gameLog: [],
          }
        : {}),
  };
}

async function seedParticipants(actorId: string) {
  for (const person of CIRCUIT1_PEOPLE) {
    await db
      .collection("participants")
      .doc(person.id)
      .set(participantDoc(actorId, person));
  }
}

async function seedTeams(actorId: string) {
  for (const team of CIRCUIT1_TEAMS) {
    const exportedStats = CIRCUIT1_TEAM_STATS[team.id];
    const seasonStats = exportedStats?.seasonStats ?? team.seasonStats;
    const pointsPerGame = exportedStats?.pointsPerGame ?? team.pointsPerGame;
    const fieldGoalPct = exportedStats?.fieldGoalPct ?? team.fieldGoalPct;
    const threePointPct = exportedStats?.threePointPct ?? team.threePointPct;
    const hc = getPersonById(staffId("hc", team.slug))!;
    const ac = getPersonById(staffId("ac", team.slug))!;
    const tm = getPersonById(staffId("tm", team.slug))!;
    const base = baseDocumentFields(
      team.id,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    );
    await db.collection("teams").doc(team.id).set({
      ...base,
      status: "active",
      name: team.name,
      organizationId: CIRCUIT1_ORG_ID,
      ageGroup: "High School",
      ageGroupId: CIRCUIT1_AGE_GROUP_ID,
      division: team.division,
      seasonId: CIRCUIT1_SEASON_ID,
      headCoachParticipantId: hc.id,
      headCoachName: `${hc.firstName} ${hc.lastName}`,
      assistantCoachName: `${ac.firstName} ${ac.lastName}`,
      assistantCoachParticipantId: ac.id,
      teamManagerName: `${tm.firstName} ${tm.lastName}`,
      teamManagerParticipantId: tm.id,
      playerCount: 8,
      homeFacilityId: CIRCUIT1_FACILITY_ID,
      homeBinodeId: "PHX-01",
      homeFacilityName: "NBBL Academy — PHX-01",
      homeCourtId: CIRCUIT1_COURT_ID,
      homeCourt: "Main Court",
      practiceDays: team.practiceDays,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      seasonStats,
      pointsPerGame,
      fieldGoalPct,
      threePointPct,
      practiceAttendancePct: 88 + (seasonStats.wins % 10),
      developmentProgressPct: 72 + (seasonStats.gamesPlayed % 15),
      logoUrl: teamLogoUrl(
        team.name,
        team.primaryColor,
        team.secondaryColor
      ),
    });
  }
}

async function seedMembership(
  actorId: string,
  id: string,
  teamId: string,
  person: Circuit1Person,
  role: "player" | "coach" | "manager"
) {
  const base = baseDocumentFields(
    id,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  await db.collection("memberships").doc(id).set({
    ...base,
    teamId,
    participantId: person.id,
    participantName: `${person.firstName} ${person.lastName}`,
    role,
  });
}

async function seedMemberships(actorId: string) {
  for (const team of CIRCUIT1_TEAMS) {
    const slug = team.slug;
    const players = CIRCUIT1_PEOPLE.filter(
      (p) => p.type === "player" && p.teamSlug === slug
    );
    for (const p of players) {
      const memId = `membership_player_${slug}_${p.id.split("_").pop()}`;
      await seedMembership(actorId, memId, team.id, p, "player");
    }
    const hc = getPersonById(staffId("hc", slug))!;
    const ac = getPersonById(staffId("ac", slug))!;
    const tm = getPersonById(staffId("tm", slug))!;
    await seedMembership(
      actorId,
      `membership_hc_${slug}`,
      team.id,
      hc,
      "coach"
    );
    await seedMembership(
      actorId,
      `membership_ac_${slug}`,
      team.id,
      ac,
      "coach"
    );
    await seedMembership(
      actorId,
      `membership_tm_${slug}`,
      team.id,
      tm,
      "manager"
    );
  }
}

const NIL_MONTHLY_PLAN_ID = "plan_nil_monthly";

async function seedMembershipPlans(actorId: string) {
  const base = baseDocumentFields(
    NIL_MONTHLY_PLAN_ID,
    actorId,
    ENTERPRISE_ID,
    DEFAULT_TENANT_ID
  );
  await db.collection("membershipPlans").doc(NIL_MONTHLY_PLAN_ID).set({
    ...base,
    name: "NIL Monthly",
    description: "Monthly membership for NIL athletes",
    monthlyAmount: 125,
    currency: "USD",
    billingInterval: "monthly",
    status: "active",
  });
}

async function seedPlayerMemberships(actorId: string) {
  const players = CIRCUIT1_PEOPLE.filter((p) => p.type === "player");
  for (const p of players) {
    const team = CIRCUIT1_TEAMS.find((t) => t.slug === p.teamSlug)!;
    const id = `playermembership_${p.id}`;
    const base = baseDocumentFields(
      id,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    );
    await db.collection("playerMemberships").doc(id).set({
      ...base,
      participantId: p.id,
      participantName: `${p.firstName} ${p.lastName}`,
      teamId: team.id,
      teamName: team.name,
      planId: NIL_MONTHLY_PLAN_ID,
      planName: "NIL Monthly",
      monthlyAmount: 125,
      currency: "USD",
      status: "active",
      effectiveDate: "2026-08-01",
      nextBillingDate: "2026-09-01",
      autoRenew: true,
      pausedAt: null,
      cancelledAt: null,
      cancelReason: null,
    });
  }
}

async function seedPlayerActivity(actorId: string) {
  const focuses = [
    "Improve shooting consistency",
    "Increase lateral quickness",
    "Improve defensive footwork",
    "Increase Basketball IQ",
    "Strength training",
    "Leadership development",
    "Communication",
    "Court vision",
  ];
  const players = CIRCUIT1_PEOPLE.filter((p) => p.type === "player");
  const now = Date.now();

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const team = CIRCUIT1_TEAMS.find((t) => t.slug === p.teamSlug)!;
    const evalDoneId = `eval_done_${p.id}`;
    const evalSchedId = `eval_sched_${p.id}`;
    const devId = `devplan_${p.id}`;

    const evalBase = baseDocumentFields(
      evalDoneId,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    );
    await db.collection("evaluations").doc(evalDoneId).set({
      ...evalBase,
      participantId: p.id,
      teamId: team.id,
      status: "completed",
      title: "Mid-season skills evaluation",
      rating: 72 + (i % 18),
      comments:
        "Strong effort and coachability. Continue building consistency in game situations.",
      completedAt: new Date(now - 14 * 86400000).toISOString(),
      scheduledAt: new Date(now - 21 * 86400000).toISOString(),
    });

    const evalSchedBase = baseDocumentFields(
      evalSchedId,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID,
      "pending"
    );
    await db.collection("evaluations").doc(evalSchedId).set({
      ...evalSchedBase,
      participantId: p.id,
      teamId: team.id,
      status: "scheduled",
      title: "End-of-circuit evaluation",
      scheduledAt: new Date(now + 21 * 86400000).toISOString(),
      comments: "Scheduled with head coach and development staff.",
    });

    const devBase = baseDocumentFields(devId, actorId, ENTERPRISE_ID, DEFAULT_TENANT_ID);
    await db.collection("developmentPlans").doc(devId).set({
      ...devBase,
      participantId: p.id,
      teamId: team.id,
      status: "active",
      focusAreas: [
        focuses[i % focuses.length],
        focuses[(i + 3) % focuses.length],
      ],
      progressPct: 55 + (i % 40),
    });

    for (let j = 0; j < 6; j++) {
      const attId = `attendance_${p.id}_${j}`;
      const attBase = baseDocumentFields(
        attId,
        actorId,
        ENTERPRISE_ID,
        DEFAULT_TENANT_ID
      );
      const day = new Date(now - j * 3 * 86400000);
      await db.collection("attendance").doc(attId).set({
        ...attBase,
        participantId: p.id,
        teamId: team.id,
        date: day.toISOString().slice(0, 10),
        eventType: j % 2 === 0 ? "practice" : "game",
        status: j % 5 === 0 ? "late" : "present",
      });
    }
  }
}

async function seedEvents(actorId: string) {
  const types = [
    "practice",
    "game",
    "team_meeting",
    "skill_development",
    "film_session",
    "strength_training",
  ] as const;
  const now = Date.now();
  let eventIndex = 0;

  for (const team of CIRCUIT1_TEAMS) {
    for (let i = 0; i < 8; i++) {
      const id = `event_${team.slug}_${i}`;
      const base = baseDocumentFields(id, actorId, ENTERPRISE_ID, DEFAULT_TENANT_ID);
      const start = new Date(now + (eventIndex + 1) * 86400000);
      eventIndex++;
      await db.collection("events").doc(id).set({
        ...base,
        teamId: team.id,
        teamName: team.name,
        type: types[i % types.length],
        title: `${team.name} — ${types[i % types.length].replace("_", " ")}`,
        location: "NBBL Academy — PHX-01 / Main Court",
        startAt: start.toISOString(),
        endAt: new Date(start.getTime() + 90 * 60000).toISOString(),
      });
    }
  }
}

async function seedCommunications(actorId: string) {
  const items = [
    {
      id: "comm_announcement_circuit1",
      type: "announcement",
      subject: "Circuit 1 launch week",
      body: "Welcome to NBBL Circuit 1. All teams report to NBBL Academy — PHX-01 this Saturday.",
    },
    {
      id: "comm_coach_message",
      type: "coach_message",
      subject: "Practice intensity",
      body: "Coaches: emphasize defensive communication in tomorrow's sessions.",
    },
    {
      id: "comm_practice_reminder",
      type: "practice_reminder",
      subject: "Practice reminder",
      body: "Reminder: bring practice gear and water. Main Court check-in 15 minutes early.",
    },
    {
      id: "comm_schedule_update",
      type: "schedule_update",
      subject: "Schedule update",
      body: "Week 3 game times posted. Review your team schedule in PlayCenter.",
    },
    {
      id: "comm_registration",
      type: "registration_confirmation",
      subject: "Registration confirmed",
      body: "Your Circuit 1 athlete registration is confirmed for Anthony Ray Recruiting Academy.",
    },
  ];

  for (const item of items) {
    const base = baseDocumentFields(
      item.id,
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    );
    await db.collection("communications").doc(item.id).set({
      ...base,
      type: item.type,
      subject: item.subject,
      body: item.body,
      teamId: CIRCUIT1_TEAMS[0].id,
    });
  }

  await db.collection("notifications").doc("notif_circuit1_welcome").set({
    ...baseDocumentFields(
      "notif_circuit1_welcome",
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    ),
    title: "Circuit 1 is live",
    message: "Dashboard metrics reflect inaugural circuit rosters.",
    read: false,
  });

  await db.collection("reports").doc("report_circuit1_summary").set({
    ...baseDocumentFields(
      "report_circuit1_summary",
      actorId,
      ENTERPRISE_ID,
      DEFAULT_TENANT_ID
    ),
    title: "Circuit 1 roster summary",
    summary: "64 NIL athletes across 8 teams — Anthony Ray Recruiting Academy.",
  });
}

async function seedAuditLogs(actorId: string) {
  const team = CIRCUIT1_TEAMS[0];
  await db.collection("auditLogs").doc("audit_circuit1_roster_locked").set({
    id: "audit_circuit1_roster_locked",
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    entityType: "team",
    entityId: team.id,
    action: "activity",
    summary: `${team.name} roster finalized for Circuit 1`,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: actorId,
    updatedBy: actorId,
    status: "active",
    version: 1,
    payload: {},
  });
}

async function seedSettings() {
  await db.collection("settings").doc(DEFAULT_TENANT_ID).set({
    id: DEFAULT_TENANT_ID,
    enterpriseId: ENTERPRISE_ID,
    tenantId: DEFAULT_TENANT_ID,
    name: "NBBL Circuit 1 — Phoenix",
    currentSeasonId: CIRCUIT1_SEASON_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    version: 1,
  });
}

async function seedStats() {
  const teamsSnap = await db
    .collection("teams")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("deletedAt", "==", null)
    .get();

  let activeTeams = 0;
  let teamsThisSeason = 0;
  const headCoachIds = new Set<string>();

  teamsSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.status === "active") activeTeams++;
    if (data.seasonId === CIRCUIT1_SEASON_ID) teamsThisSeason++;
    if (data.headCoachParticipantId) {
      headCoachIds.add(data.headCoachParticipantId as string);
    }
  });

  const playersSnap = await db
    .collection("participants")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("type", "==", "player")
    .where("deletedAt", "==", null)
    .get();

  const eventsSnap = await db
    .collection("events")
    .where("tenantId", "==", DEFAULT_TENANT_ID)
    .where("deletedAt", "==", null)
    .get();

  let practices = 0;
  let games = 0;
  let upcoming = 0;
  const now = Date.now();
  eventsSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.type === "practice") practices++;
    if (data.type === "game") games++;
    if (new Date(data.startAt as string).getTime() > now) upcoming++;
  });

  const updatedAt = new Date().toISOString();
  const totalTeams = teamsSnap.size;
  const totalCoaches = headCoachIds.size;

  await db
    .collection("tenants")
    .doc(DEFAULT_TENANT_ID)
    .collection("stats")
    .doc("teams")
    .set({
      totalTeams,
      activeTeams,
      teamsThisSeason,
      totalCoaches,
      previousTotalTeams: totalTeams,
      previousActiveTeams: activeTeams,
      previousTeamsThisSeason: teamsThisSeason,
      previousTotalCoaches: totalCoaches,
      updatedAt,
    });

  await db
    .collection("tenants")
    .doc(DEFAULT_TENANT_ID)
    .collection("stats")
    .doc("dashboard")
    .set({
      participantPlayers: playersSnap.size,
      organizations: 1,
      facilities: 1,
      binodes: 1,
      teams: teamsSnap.size,
      headCoaches: 8,
      assistantCoaches: 8,
      teamManagers: 8,
      practices,
      games,
      upcomingEvents: upcoming,
      totalRevenue: 8000,
      activeMemberships: 64,
      registrations: 64,
      updatedAt,
    });
}

async function syncCircuit1GameStats(actorId: string) {
  const { playerStats, teamStats } = buildCircuit1SimulationStats();
  const now = new Date().toISOString();

  const playerEntries = Object.entries(playerStats);
  const batchSize = 400;
  for (let i = 0; i < playerEntries.length; i += batchSize) {
    const batch = db.batch();
    for (const [participantId, stats] of playerEntries.slice(i, i + batchSize)) {
      batch.update(db.collection("participants").doc(participantId), {
        gameSeasonStats: stats.gameSeasonStats,
        gameLog: stats.gameLog,
        updatedAt: now,
        updatedBy: actorId,
      });
    }
    await batch.commit();
  }

  const teamEntries = Object.entries(teamStats);
  for (let i = 0; i < teamEntries.length; i += batchSize) {
    const batch = db.batch();
    for (const [teamId, stats] of teamEntries.slice(i, i + batchSize)) {
      batch.update(db.collection("teams").doc(teamId), {
        seasonStats: stats.seasonStats,
        pointsPerGame: stats.pointsPerGame,
        fieldGoalPct: stats.fieldGoalPct,
        threePointPct: stats.threePointPct,
        updatedAt: now,
        updatedBy: actorId,
      });
    }
    await batch.commit();
  }
}

async function main() {
  console.log(`Seeding NBBL Circuit 1 (project: ${PROJECT_ID})...`);
  await seedRoles();
  await wipeTenantSeedData();
  const actorId = await seedAdminUser();
  await seedOrganization(actorId);
  await seedFacility(actorId);
  await seedBinode(actorId);
  await seedCourt(actorId);
  await seedAgeGroup(actorId);
  await seedSeason(actorId);
  await seedParticipants(actorId);
  await seedTeams(actorId);
  await seedMemberships(actorId);
  await seedMembershipPlans(actorId);
  await seedPlayerMemberships(actorId);
  await seedPlayerActivity(actorId);
  await seedEvents(actorId);
  await seedCircuit1Tournament(db, actorId);
  await syncCircuit1GameStats(actorId);
  await seedCommunications(actorId);
  await seedAuditLogs(actorId);
  await seedSettings();
  await seedStats();
  await seedAdminUser();
  await seedPlayerUser();
  await seedCoachUser();
  await seedFanUser();

  console.log("Seed complete.");
  console.log(`Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Player login: ${PLAYER_EMAIL} / ${PLAYER_PASSWORD}`);
  console.log(`Coach login: ${COACH_EMAIL} / ${COACH_PASSWORD}`);
  console.log(`Fan login: ${FAN_EMAIL} / ${FAN_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
