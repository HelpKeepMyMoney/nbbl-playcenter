import {
  CIRCUIT1_TEAMS,
  playerId,
  staffId,
  type TeamSlug,
} from "./circuit1-ids";
import { portraitHeadshotUrl } from "./circuit1-headshots";

export type ParticipantRole = "player" | "coach" | "staff";

export interface Circuit1Person {
  id: string;
  type: ParticipantRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  headshotUrl: string;
  teamSlug: TeamSlug;
  staffRole?: "head" | "assistant" | "manager";
  gender: "male" | "female";
  dateOfBirth?: string;
  height?: string;
  weight?: string;
  primaryPosition?: string;
  secondaryPosition?: string;
  jerseyNumber?: number;
  graduationYear?: number;
  nbblId?: string;
  address?: string;
  parentGuardian?: string;
  emergencyContact?: string;
  school?: string;
  bio?: string;
  tags?: string[];
  dominantHand?: string;
  memberSince?: string;
  attendancePct?: number;
  overallRating?: number;
  developmentRating?: number;
  basketballIQ?: number;
  leadershipRating?: number;
  athleticismRating?: number;
  shootingRating?: number;
  defenseRating?: number;
  ballHandlingRating?: number;
  strengthRating?: number;
}

const BOYS_ROSTER: Record<TeamSlug, string[]> = {
  storm: [
    "Marcus Allen",
    "Jordan Brooks",
    "Elijah Carter",
    "Noah Diaz",
    "Caleb Edwards",
    "Isaiah Foster",
    "Mason Garcia",
    "Lucas Hayes",
  ],
  elite: [
    "Ryan Mitchell",
    "Dylan Nguyen",
    "Tyler Owens",
    "Brandon Patel",
    "Andre Quinn",
    "Malik Reed",
    "Chris Sullivan",
    "Devin Torres",
  ],
  force: [
    "Nathan Vasquez",
    "Oscar Washington",
    "Parker Young",
    "Quentin Zimmerman",
    "Adrian Banks",
    "Bryce Coleman",
    "Carter Dunn",
    "Derek Evans",
  ],
  select: [
    "Grant Fisher",
    "Henry Gomez",
    "Ivan Howard",
    "Jake Ingram",
    "Kyle Johnson",
    "Leo Kennedy",
    "Miles Lambert",
    "Nolan Martin",
  ],
  queens: [],
  flight: [],
  legacy: [],
  united: [],
};

const GIRLS_ROSTER: Record<TeamSlug, string[]> = {
  storm: [],
  elite: [],
  force: [],
  select: [],
  queens: [
    "Ava Anderson",
    "Bella Baker",
    "Chloe Cooper",
    "Diana Collins",
    "Emma Davis",
    "Fiona Edwards",
    "Grace Foster",
    "Hannah Garcia",
  ],
  flight: [
    "Isabella Hayes",
    "Jasmine Irving",
    "Kiana Kim",
    "Layla Lopez",
    "Maya Mitchell",
    "Nia Nguyen",
    "Olivia Owens",
    "Paige Patel",
  ],
  legacy: [
    "Quinn Quinn",
    "Riley Reed",
    "Sofia Sullivan",
    "Tara Torres",
    "Uma Underwood",
    "Vanessa Vasquez",
    "Willow Washington",
    "Zoe Young",
  ],
  united: [
    "Aaliyah Adams",
    "Brianna Brooks",
    "Camila Carter",
    "Destiny Diaz",
    "Elena Edwards",
    "Faith Foster",
    "Gabriela Garcia",
    "Hailey Hayes",
  ],
};

const STAFF: Record<
  TeamSlug,
  {
    hc: { first: string; last: string };
    ac: { first: string; last: string };
    tm: { first: string; last: string };
  }
> = {
  storm: {
    hc: { first: "Anthony", last: "Ray" },
    ac: { first: "Marcus", last: "Thompson" },
    tm: { first: "Linda", last: "Morales" },
  },
  elite: {
    hc: { first: "Robert", last: "Chen" },
    ac: { first: "James", last: "Okafor" },
    tm: { first: "Patricia", last: "Nguyen" },
  },
  force: {
    hc: { first: "Michael", last: "Brooks" },
    ac: { first: "Carlos", last: "Rivera" },
    tm: { first: "Angela", last: "Scott" },
  },
  select: {
    hc: { first: "Daniel", last: "Kim" },
    ac: { first: "Terrence", last: "Walters" },
    tm: { first: "Michelle", last: "Adams" },
  },
  queens: {
    hc: { first: "Jennifer", last: "Lopez" },
    ac: { first: "Amanda", last: "Stewart" },
    tm: { first: "Rachel", last: "Green" },
  },
  flight: {
    hc: { first: "Christine", last: "Hall" },
    ac: { first: "Nicole", last: "Price" },
    tm: { first: "Stephanie", last: "Ward" },
  },
  legacy: {
    hc: { first: "Laura", last: "Bennett" },
    ac: { first: "Heather", last: "Cole" },
    tm: { first: "Kimberly", last: "Russell" },
  },
  united: {
    hc: { first: "Sandra", last: "Parker" },
    ac: { first: "Melissa", last: "Turner" },
    tm: { first: "Diana", last: "Phillips" },
  },
};

const POSITIONS = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
];

const SCHOOLS = [
  "Brophy College Preparatory",
  "Desert Vista High School",
  "Mountain Pointe High School",
  "Chandler High School",
  "Hamilton High School",
  "Corona del Sol High School",
  "Tempe High School",
  "Arcadia High School",
];

let portraitSlot = 0;

function nextPortrait(gender: "male" | "female"): string {
  const idx = portraitSlot++;
  return portraitHeadshotUrl(gender, idx);
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? "Player";
  const last = parts.slice(1).join(" ") || "Unknown";
  return { first, last };
}

function buildPlayer(
  slug: TeamSlug,
  index: number,
  fullName: string,
  gender: "male" | "female",
  nbblSeq: number
): Circuit1Person {
  const { first, last } = splitName(fullName);
  const id = playerId(slug, index);
  const seed = nbblSeq * 17 + index;
  const pos = POSITIONS[seed % POSITIONS.length];
  const sec = POSITIONS[(seed + 2) % POSITIONS.length];
  const gradYear = 2026 + (seed % 3);
  const jersey = ((seed % 55) + 1);
  return {
    id,
    type: "player",
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(/\s/g, "")}@nbbl.local`,
    phone: `+1-480-${String(200 + (seed % 800)).padStart(3, "0")}-${String(1000 + seed).slice(-4)}`,
    headshotUrl: nextPortrait(gender),
    teamSlug: slug,
    gender,
    dateOfBirth: `2008-${String((seed % 12) + 1).padStart(2, "0")}-${String((seed % 28) + 1).padStart(2, "0")}`,
    height: `${5 + (seed % 2)}'${(seed % 12)}\"`,
    weight: `${145 + (seed % 45)} lbs`,
    primaryPosition: pos,
    secondaryPosition: sec,
    jerseyNumber: jersey,
    graduationYear: gradYear,
    nbblId: `NBBL-C1-${String(nbblSeq).padStart(4, "0")}`,
    address: `${1200 + seed} E Camelback Rd, Phoenix, AZ 85016`,
    parentGuardian: `${last} Family`,
    emergencyContact: `+1-480-555-${String(2000 + seed).slice(-4)}`,
    school: SCHOOLS[seed % SCHOOLS.length],
    bio: `${first} ${last} is a ${pos} for Circuit 1, focused on team-first basketball and steady improvement.`,
    tags: ["NIL", "Circuit 1", gender === "male" ? "Boys" : "Girls"],
    dominantHand: seed % 3 === 0 ? "Left" : "Right",
    memberSince: "August 2025",
    attendancePct: 82 + (seed % 15),
    overallRating: 72 + (seed % 18),
    developmentRating: 70 + (seed % 20),
    basketballIQ: 68 + (seed % 22),
    leadershipRating: 65 + (seed % 25),
    athleticismRating: 70 + (seed % 24),
    shootingRating: 66 + (seed % 26),
    defenseRating: 64 + (seed % 28),
    ballHandlingRating: 62 + (seed % 30),
    strengthRating: 60 + (seed % 32),
  };
}

function buildStaff(
  slug: TeamSlug,
  role: "head" | "assistant" | "manager",
  first: string,
  last: string,
  gender: "male" | "female"
): Circuit1Person {
  const id =
    role === "head"
      ? staffId("hc", slug)
      : role === "assistant"
        ? staffId("ac", slug)
        : staffId("tm", slug);
  const type = role === "manager" ? "staff" : "coach";
  return {
    id,
    type,
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@nbbl.local`,
    phone: `+1-602-555-${String(id.length * 111).slice(-4)}`,
    headshotUrl: nextPortrait(gender),
    teamSlug: slug,
    staffRole: role === "manager" ? "manager" : role,
    gender,
    bio:
      role === "head"
        ? `Head Coach ${first} ${last} leads skill development and in-game strategy for Circuit 1.`
        : role === "assistant"
          ? `Assistant Coach ${first} ${last} supports practice planning and player mentorship.`
          : `${first} ${last} manages team operations, scheduling, and parent communications.`,
    memberSince: "June 2025",
    tags: role === "manager" ? ["Operations"] : ["Coaching"],
  };
}

export function buildCircuit1Roster(): Circuit1Person[] {
  portraitSlot = 0;
  const people: Circuit1Person[] = [];
  let nbblSeq = 1;

  for (const team of CIRCUIT1_TEAMS) {
    const slug = team.slug;
    const staff = STAFF[slug];
    const coachGender = team.gender;
    people.push(
      buildStaff(slug, "head", staff.hc.first, staff.hc.last, coachGender),
      buildStaff(
        slug,
        "assistant",
        staff.ac.first,
        staff.ac.last,
        coachGender
      ),
      buildStaff(slug, "manager", staff.tm.first, staff.tm.last, "female")
    );
  }

  for (const team of CIRCUIT1_TEAMS) {
    const slug = team.slug;
    const names =
      team.gender === "male"
        ? BOYS_ROSTER[slug]
        : GIRLS_ROSTER[slug];
    names.forEach((name, i) => {
      people.push(
        buildPlayer(slug, i + 1, name, team.gender, nbblSeq++)
      );
    });
  }

  return people;
}

export const CIRCUIT1_PEOPLE = buildCircuit1Roster();

export function getPersonById(id: string): Circuit1Person | undefined {
  return CIRCUIT1_PEOPLE.find((p) => p.id === id);
}
