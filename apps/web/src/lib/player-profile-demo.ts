import type { ParticipantDoc } from "@/types/firestore";
import type { TeamDoc } from "@/types/firestore";
import { computePlayerStatistics } from "@/lib/player-statistics";

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export type PlayerProfileTab =
  | "overview"
  | "statistics"
  | "evaluations"
  | "development"
  | "attendance"
  | "game-log"
  | "documents"
  | "activity";

export interface PlayerProfileViewModel {
  jerseyNumber: number;
  position: string;
  height: string;
  weight: string;
  handedness: string;
  dateOfBirth: string;
  location: string;
  graduationClass: string;
  nbblId: string;
  memberSince: string;
  parentGuardian: string;
  bio: string;
  teamLabel: string;
  facilityLabel: string;
  divisionLabel: string;
  seasonStats: {
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
  };
  skills: { label: string; value: number }[];
  overallRating: number;
  developmentFocus: { label: string; value: number }[];
  nextEvaluation: { date: string; title: string };
  achievements: string[];
  playerTags: string[];
  recentGames: {
    matchId?: string;
    date: string;
    opponent: string;
    result: string;
    win: boolean;
    min: number;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    fgPct: string;
    threePct: string;
  }[];
  attendance: {
    present: number;
    late: number;
    absent: number;
    excused: number;
  };
  recentActivity: {
    title: string;
    detail: string;
    when: string;
    tone: "red" | "green" | "blue" | "amber";
  }[];
}

const POSITIONS = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
];

const EMPTY_SEASON_STATS: PlayerProfileViewModel["seasonStats"] = {
  gamesPlayed: 0,
  pointsPerGame: 0,
  reboundsPerGame: 0,
  assistsPerGame: 0,
};

const OPPONENTS = [
  "Suns Elite",
  "Mercury Prep",
  "AZ Storm",
  "Valley Heat",
  "Desert Hawks",
  "Phoenix Rising",
  "Scottsdale Select",
  "Mesa Thunder",
  "Glendale Guard",
  "Tempe Titans",
];

function mixSeed(seed: number, salt: number): number {
  return Math.abs((seed * 31 + salt * 17) | 0);
}

function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(mixSeed(seed, salt)) * 10000;
  return x - Math.floor(x);
}

function buildAttendance(seed: number): PlayerProfileViewModel["attendance"] {
  const present = 38 + (seed % 22);
  const late = 1 + (mixSeed(seed, 1) % 7);
  const absent = mixSeed(seed, 2) % 6;
  const excused = mixSeed(seed, 3) % 4;
  return { present, late, absent, excused };
}

function formatShotMadePct(made: number, attempts: number): string {
  return `${made}/${attempts}`;
}

const ACTIVITY_WHEN = [
  "Yesterday",
  "2 days ago",
  "3 days ago",
  "5 days ago",
  "1 week ago",
  "2 weeks ago",
];

function mapGameLogToRecentGames(
  gameLog: NonNullable<ParticipantDoc["gameLog"]>
): PlayerProfileViewModel["recentGames"] {
  return gameLog.map((entry) => ({
    matchId: entry.matchId,
    date: entry.date,
    opponent: entry.opponent,
    result: entry.result,
    win: entry.win,
    min: entry.min,
    pts: entry.pts,
    reb: entry.reb,
    ast: entry.ast,
    stl: entry.stl,
    fgPct: formatShotMadePct(entry.fgMade, entry.fgAtt),
    threePct:
      entry.threeAtt > 0
        ? formatShotMadePct(entry.threeMade, entry.threeAtt)
        : "0/0",
  }));
}

function buildPlayerRecentActivityFromGames(
  recentGames: PlayerProfileViewModel["recentGames"],
  overallRating: number,
  seed: number
): PlayerProfileViewModel["recentActivity"] {
  const base = buildPlayerRecentActivity(seed, overallRating, recentGames);
  if (recentGames.length === 0) {
    return base.filter((item) => item.title !== "Stats updated");
  }
  return base;
}
function buildPlayerRecentActivity(
  seed: number,
  overallRating: number,
  recentGames: PlayerProfileViewModel["recentGames"]
): PlayerProfileViewModel["recentActivity"] {
  const focusAreas = [
    "Shooting",
    "Ball handling",
    "Defense",
    "Conditioning",
    "Court vision",
  ];
  const lastOpponent = recentGames[0]?.opponent ?? OPPONENTS[seed % OPPONENTS.length];
  const evalScore = Math.min(99, overallRating + (mixSeed(seed, 5) % 8) - 3);
  const practiceStatus =
    mixSeed(seed, 6) % 3 === 0 ? "Late" : "Present";

  return [
    {
      title: "Evaluation completed",
      detail: `Skills assessment — Overall ${evalScore}/100`,
      when: ACTIVITY_WHEN[mixSeed(seed, 7) % 2],
      tone: "green",
    },
    {
      title: "Stats updated",
      detail: `Game vs ${lastOpponent}`,
      when: ACTIVITY_WHEN[1 + (mixSeed(seed, 8) % 2)],
      tone: "blue",
    },
    {
      title: "Attendance marked",
      detail: `Practice — ${practiceStatus}`,
      when: ACTIVITY_WHEN[2 + (mixSeed(seed, 9) % 2)],
      tone: "amber",
    },
    {
      title: "Development plan updated",
      detail: `${focusAreas[mixSeed(seed, 10) % focusAreas.length]} focus added`,
      when: ACTIVITY_WHEN[3 + (mixSeed(seed, 11) % 2)],
      tone: "red",
    },
  ];
}

function buildCoachRecentActivity(
  seed: number,
  teamName: string
): PlayerProfileViewModel["recentActivity"] {
  const drillThemes = [
    "transition offense",
    "closeout drills",
    "press break",
    "free-throw situations",
  ];
  return [
    {
      title: "Practice led",
      detail: `${teamName} — ${drillThemes[seed % drillThemes.length]}`,
      when: ACTIVITY_WHEN[seed % 2],
      tone: "green",
    },
    {
      title: "Roster updated",
      detail: `Rotation notes for ${OPPONENTS[mixSeed(seed, 1) % OPPONENTS.length]}`,
      when: ACTIVITY_WHEN[1 + (mixSeed(seed, 2) % 2)],
      tone: "blue",
    },
    {
      title: "Attendance marked",
      detail:
        mixSeed(seed, 3) % 4 === 0 ? "Film session — Late" : "Practice — Present",
      when: ACTIVITY_WHEN[2 + (mixSeed(seed, 4) % 2)],
      tone: "amber",
    },
    {
      title: "Development plan updated",
      detail: `Added ${drillThemes[mixSeed(seed, 5) % drillThemes.length]} block`,
      when: ACTIVITY_WHEN[4 + (mixSeed(seed, 6) % 2)],
      tone: "red",
    },
  ];
}

function buildStaffRecentActivity(
  seed: number,
  teamName: string
): PlayerProfileViewModel["recentActivity"] {
  const tasks = [
    "tournament travel times",
    "uniform pickup schedule",
    "facility access list",
    "parent volunteer shifts",
  ];
  return [
    {
      title: "Schedule published",
      detail: `${teamName} — ${tasks[seed % tasks.length]}`,
      when: ACTIVITY_WHEN[mixSeed(seed, 1) % 3],
      tone: "green",
    },
    {
      title: "Message sent",
      detail: `Reminder: ${OPPONENTS[mixSeed(seed, 2) % OPPONENTS.length]} weekend`,
      when: ACTIVITY_WHEN[2 + (mixSeed(seed, 3) % 2)],
      tone: "blue",
    },
    {
      title: "Attendance marked",
      detail:
        mixSeed(seed, 4) % 5 === 0
          ? "Team meeting — Excused"
          : "Team meeting — Present",
      when: ACTIVITY_WHEN[3 + (mixSeed(seed, 5) % 2)],
      tone: "amber",
    },
    {
      title: "Document uploaded",
      detail: `${3 + (mixSeed(seed, 6) % 8)} ${mixSeed(seed, 7) % 2 === 0 ? "waivers" : "medical forms"}`,
      when: ACTIVITY_WHEN[4 + (mixSeed(seed, 8) % 2)],
      tone: "red",
    },
  ];
}

const GUARDIAN_FIRST_NAMES = [
  "Michael",
  "Sarah",
  "David",
  "Jennifer",
  "Robert",
  "Maria",
  "James",
  "Linda",
  "Carlos",
  "Angela",
  "Kevin",
  "Patricia",
  "Brian",
  "Michelle",
  "Anthony",
];

const GUARDIAN_LAST_NAMES = [
  "Williams",
  "Johnson",
  "Martinez",
  "Chen",
  "Thompson",
  "Garcia",
  "Anderson",
  "Nguyen",
  "Robinson",
  "Lee",
  "Walker",
  "Patel",
  "Brooks",
  "Foster",
  "Hayes",
];

function buildParentGuardianName(
  participant: Pick<ParticipantDoc, "lastName">,
  seed: number
): string {
  const first =
    GUARDIAN_FIRST_NAMES[mixSeed(seed, 20) % GUARDIAN_FIRST_NAMES.length];
  const usePlayerLastName = mixSeed(seed, 21) % 4 !== 0;
  const last = usePlayerLastName
    ? participant.lastName
    : GUARDIAN_LAST_NAMES[mixSeed(seed, 22) % GUARDIAN_LAST_NAMES.length];
  return `${first} ${last}`;
}

export function participantShowsGameStatistics(type: string): boolean {
  return type === "player";
}

export function buildPlayerProfileViewModel(
  participant: ParticipantDoc,
  primaryTeam?: TeamDoc | null,
  orgName?: string
): PlayerProfileViewModel {
  const seed = hashId(participant.id);
  const jerseyNumber = (seed % 55) + 1;
  const rating = 72 + (seed % 18);
  const skillBase = 70 + (seed % 20);

  const teamName = primaryTeam?.name ?? "Lakers Elite U16";
  const division = primaryTeam?.division ?? "Elite Division";
  const binode = primaryTeam?.homeBinodeId ?? "PHX-01";

  const baseMeta = {
    dateOfBirth: participant.dateOfBirth ?? "March 15, 2008",
    location: "Phoenix, AZ",
    graduationClass: participant.graduationYear
      ? `Class of ${participant.graduationYear}`
      : "Class of 2026",
    nbblId:
      participant.nbblId ??
      `NBBL-2024-${participant.id.slice(0, 4).toUpperCase()}`,
    memberSince: participant.memberSince ?? "March 2021",
    teamLabel: teamName,
    facilityLabel:
      participant.homeFacilityName ??
      `${orgName ?? "NBBL Academy"} - ${binode}`,
    divisionLabel: participant.division ?? division,
  };

  const attendance = buildAttendance(seed);

  if (participant.type === "coach") {
    const years = 3 + (seed % 12);
    return {
      jerseyNumber: 0,
      position: "Coach",
      height: "—",
      weight: "—",
      handedness: "—",
      parentGuardian: "—",
      ...baseMeta,
      dateOfBirth: "June 8, 1985",
      graduationClass: `${years} seasons with NBBL`,
      bio: `${participant.firstName} leads player development for ${teamName}, emphasizing fundamentals, teamwork, and in-game decision-making.`,
      seasonStats: EMPTY_SEASON_STATS,
      skills: [],
      overallRating: 0,
      developmentFocus: [
        { label: "Player Development", value: 75 + (seed % 20) },
        { label: "Practice Planning", value: 70 + (seed % 25) },
        { label: "Game Strategy", value: 68 + (seed % 28) },
        { label: "Communication", value: 80 + (seed % 15) },
      ].map((s) => ({ ...s, value: Math.min(99, s.value) })),
      nextEvaluation: {
        date: "July 10, 2024",
        title: "Season coaching review",
      },
      achievements: [
        "NBBL Coach of the Year nominee",
        `${years}+ seasons with program`,
        "CPR & SafeSport certified",
      ],
      playerTags: ["Mentor", "Fundamentals", "Game IQ", "Player-first"],
      recentGames: [],
      attendance,
      recentActivity: buildCoachRecentActivity(seed, teamName),
    };
  }

  if (participant.type === "staff") {
    return {
      jerseyNumber: 0,
      position: "Staff",
      height: "—",
      weight: "—",
      handedness: "—",
      parentGuardian: "—",
      ...baseMeta,
      dateOfBirth: "September 22, 1990",
      graduationClass: "Operations & logistics",
      bio: `${participant.firstName} supports ${teamName} with scheduling, communications, and day-to-day program operations.`,
      seasonStats: EMPTY_SEASON_STATS,
      skills: [],
      overallRating: 0,
      developmentFocus: [
        { label: "Event coordination", value: 72 + (seed % 22) },
        { label: "Parent communication", value: 78 + (seed % 18) },
        { label: "Facility logistics", value: 70 + (seed % 24) },
        { label: "Compliance", value: 85 + (seed % 10) },
      ].map((s) => ({ ...s, value: Math.min(99, s.value) })),
      nextEvaluation: {
        date: "August 1, 2024",
        title: "Annual staff check-in",
      },
      achievements: [
        "Zero missed game-day setups (season)",
        "Volunteer coordinator",
        "Background check cleared",
      ],
      playerTags: ["Organized", "Reliable", "Team support", "Communicator"],
      recentGames: [],
      attendance,
      recentActivity: buildStaffRecentActivity(seed, teamName),
    };
  }

  if (!participantShowsGameStatistics(participant.type)) {
    const typeLabel =
      participant.type.charAt(0).toUpperCase() + participant.type.slice(1);
    return {
      jerseyNumber: 0,
      position: typeLabel,
      height: "—",
      weight: "—",
      handedness: "—",
      parentGuardian: "—",
      ...baseMeta,
      graduationClass: typeLabel,
      bio: `${participant.firstName} ${participant.lastName} is registered as ${typeLabel.toLowerCase()} with ${orgName ?? "NBBL Academy"}.`,
      seasonStats: EMPTY_SEASON_STATS,
      skills: [],
      overallRating: 0,
      developmentFocus: [],
      nextEvaluation: {
        date: "—",
        title: "Not scheduled",
      },
      achievements: [],
      playerTags: [typeLabel],
      recentGames: [],
      attendance,
      recentActivity: [
        {
          title: "Profile updated",
          detail: `Contact information verified for ${participant.firstName}`,
          when: ACTIVITY_WHEN[3 + (mixSeed(seed, 12) % 3)],
          tone: "green",
        },
      ],
    };
  }

  const recentGames =
    participant.gameLog && participant.gameLog.length > 0
      ? mapGameLogToRecentGames(participant.gameLog)
      : [];

  const pJersey = participant.jerseyNumber ?? jerseyNumber;
  const pRating = participant.overallRating ?? rating;
  const pSkillBase = participant.shootingRating ?? skillBase;
  const computedStats = computePlayerStatistics(
    participant.gameLog,
    participant.gameSeasonStats
  );
  const seasonStats = computedStats.hasData
    ? {
        gamesPlayed: computedStats.gamesPlayed,
        pointsPerGame: computedStats.pointsPerGame,
        reboundsPerGame: computedStats.reboundsPerGame,
        assistsPerGame: computedStats.assistsPerGame,
      }
    : EMPTY_SEASON_STATS;

  return {
    jerseyNumber: pJersey,
    position: participant.primaryPosition ?? POSITIONS[seed % POSITIONS.length],
    height: participant.height ?? `${5 + (seed % 2)}'${(seed % 12) + 1}"`,
    weight: participant.weight ?? `${150 + (seed % 40)} lbs`,
    handedness: participant.dominantHand
      ? `${participant.dominantHand} Handed`
      : seed % 2 === 0
        ? "Right Handed"
        : "Left Handed",
    dateOfBirth: baseMeta.dateOfBirth,
    location: "Phoenix, AZ",
    graduationClass: baseMeta.graduationClass,
    nbblId: baseMeta.nbblId,
    memberSince: baseMeta.memberSince,
    parentGuardian:
      participant.parentGuardian ?? buildParentGuardianName(participant, seed),
    bio:
      participant.bio ??
      `${participant.firstName} is a dynamic ${POSITIONS[seed % POSITIONS.length].toLowerCase()} known for court vision and leadership.`,
    teamLabel: baseMeta.teamLabel,
    facilityLabel: baseMeta.facilityLabel,
    divisionLabel: baseMeta.divisionLabel,
    seasonStats,
    skills: [
      { label: "Shooting", value: participant.shootingRating ?? pSkillBase + 2 },
      {
        label: "Ball Handling",
        value: participant.ballHandlingRating ?? pSkillBase + 8,
      },
      {
        label: "Basketball IQ",
        value: participant.basketballIQ ?? pSkillBase + 5,
      },
      { label: "Defense", value: participant.defenseRating ?? pSkillBase - 2 },
      {
        label: "Athleticism",
        value: participant.athleticismRating ?? pSkillBase + 10,
      },
      {
        label: "Leadership",
        value: participant.leadershipRating ?? pSkillBase,
      },
    ].map((s) => ({ ...s, value: Math.min(99, s.value) })),
    overallRating: pRating,
    developmentFocus: [
      { label: "Shooting", value: participant.shootingRating ?? pSkillBase + 2 },
      {
        label: "Ball Handling",
        value: participant.ballHandlingRating ?? pSkillBase + 8,
      },
      { label: "Defense", value: participant.defenseRating ?? pSkillBase - 2 },
      {
        label: "Strength",
        value: participant.strengthRating ?? pSkillBase - 5,
      },
    ].map((s) => ({ ...s, value: Math.min(99, s.value) })),
    nextEvaluation: {
      date: "June 15, 2024",
      title: "Skills Assessment",
    },
    achievements: [
      "NBBL All-Region Team (2024)",
      "3-Point Contest Winner",
      "Team Captain",
    ],
    playerTags: participant.tags?.length
      ? participant.tags
      : ["Playmaker", "High IQ", "Team Leader", "Hard Worker"],
    recentGames,
    attendance,
    recentActivity: buildPlayerRecentActivityFromGames(
      recentGames,
      rating,
      seed
    ),
  };
}
