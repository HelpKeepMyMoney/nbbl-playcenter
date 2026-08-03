export const CIRCUIT1_SEASON_ID = "season_circuit1_2026";

export const CIRCUIT1_ORG_ID = "org_anthony_ray_ra";
export const CIRCUIT1_FACILITY_ID = "facility_nbbl_academy";
export const CIRCUIT1_BINODE_ID = "binode_phx_01";
export const CIRCUIT1_COURT_ID = "court_main";
export const CIRCUIT1_AGE_GROUP_ID = "age_group_high_school";

export type TeamSlug =
  | "storm"
  | "elite"
  | "force"
  | "select"
  | "queens"
  | "flight"
  | "legacy"
  | "united";

export interface Circuit1TeamDef {
  id: string;
  slug: TeamSlug;
  name: string;
  division: "Boys Division" | "Girls Division";
  gender: "male" | "female";
  primaryColor: string;
  secondaryColor: string;
  practiceDays: string[];
  seasonStats: { gamesPlayed: number; wins: number; losses: number };
  pointsPerGame: number;
  fieldGoalPct: number;
  threePointPct: number;
}

export const CIRCUIT1_TEAMS: Circuit1TeamDef[] = [
  {
    id: "team_boys_phoenix_storm",
    slug: "storm",
    name: "Phoenix Storm",
    division: "Boys Division",
    gender: "male",
    primaryColor: "#1e3a8a",
    secondaryColor: "#f59e0b",
    practiceDays: ["Mon", "Wed", "Fri"],
    seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
    pointsPerGame: 0,
    fieldGoalPct: 0,
    threePointPct: 0,
  },
  {
    id: "team_boys_arizona_elite",
    slug: "elite",
    name: "Arizona Elite",
    division: "Boys Division",
    gender: "male",
    primaryColor: "#b91c1c",
    secondaryColor: "#1f2937",
    practiceDays: ["Tue", "Thu", "Sat"],
    seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
    pointsPerGame: 0,
    fieldGoalPct: 0,
    threePointPct: 0,
  },
  {
    id: "team_boys_desert_force",
    slug: "force",
    name: "Desert Force",
    division: "Boys Division",
    gender: "male",
    primaryColor: "#065f46",
    secondaryColor: "#d97706",
    practiceDays: ["Mon", "Thu", "Sat"],
    seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
    pointsPerGame: 0,
    fieldGoalPct: 0,
    threePointPct: 0,
  },
  {
    id: "team_boys_valley_select",
    slug: "select",
    name: "Valley Select",
    division: "Boys Division",
    gender: "male",
    primaryColor: "#4c1d95",
    secondaryColor: "#ec4899",
    practiceDays: ["Wed", "Fri", "Sun"],
    seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
    pointsPerGame: 0,
    fieldGoalPct: 0,
    threePointPct: 0,
  },
  {
    id: "team_girls_phoenix_queens",
    slug: "queens",
    name: "Phoenix Queens",
    division: "Girls Division",
    gender: "female",
    primaryColor: "#9d174d",
    secondaryColor: "#fbbf24",
    practiceDays: ["Mon", "Wed", "Fri"],
    seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
    pointsPerGame: 0,
    fieldGoalPct: 0,
    threePointPct: 0,
  },
  {
    id: "team_girls_arizona_flight",
    slug: "flight",
    name: "Arizona Flight",
    division: "Girls Division",
    gender: "female",
    primaryColor: "#0369a1",
    secondaryColor: "#e11d48",
    practiceDays: ["Tue", "Thu", "Sat"],
    seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
    pointsPerGame: 0,
    fieldGoalPct: 0,
    threePointPct: 0,
  },
  {
    id: "team_girls_desert_legacy",
    slug: "legacy",
    name: "Desert Legacy",
    division: "Girls Division",
    gender: "female",
    primaryColor: "#78350f",
    secondaryColor: "#14b8a6",
    practiceDays: ["Mon", "Tue", "Thu"],
    seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
    pointsPerGame: 0,
    fieldGoalPct: 0,
    threePointPct: 0,
  },
  {
    id: "team_girls_valley_united",
    slug: "united",
    name: "Valley United",
    division: "Girls Division",
    gender: "female",
    primaryColor: "#312e81",
    secondaryColor: "#f97316",
    practiceDays: ["Wed", "Fri", "Sun"],
    seasonStats: { gamesPlayed: 0, wins: 0, losses: 0 },
    pointsPerGame: 0,
    fieldGoalPct: 0,
    threePointPct: 0,
  },
];

export function teamLogoUrl(name: string, bg: string, color: string): string {
  const params = new URLSearchParams({
    name: name.replace(/\s+/g, "+"),
    background: bg.replace("#", ""),
    color: color.replace("#", ""),
    size: "128",
    bold: "true",
  });
  return `https://ui-avatars.com/api/?${params.toString()}`;
}

export function staffId(
  role: "hc" | "ac" | "tm",
  slug: TeamSlug
): string {
  if (role === "hc") return `coach_hc_${slug}`;
  if (role === "ac") return `coach_ac_${slug}`;
  return `staff_tm_${slug}`;
}

export function playerId(slug: TeamSlug, num: number): string {
  return `player_${slug}_${String(num).padStart(2, "0")}`;
}
