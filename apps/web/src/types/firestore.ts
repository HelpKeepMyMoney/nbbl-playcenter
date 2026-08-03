import type {
  DocumentStatus,
  GameSeasonStats,
  PlayerGameLogEntry,
} from "@nbbl/shared";

export interface ParticipantDoc {
  id: string;
  enterpriseId: string;
  tenantId: string;
  type: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  organizationId: string;
  status: DocumentStatus;
  deletedAt?: string | null;
  version: number;
  gender?: string | null;
  nbblId?: string | null;
  dateOfBirth?: string | null;
  height?: string | null;
  weight?: string | null;
  primaryPosition?: string | null;
  secondaryPosition?: string | null;
  jerseyNumber?: number | null;
  graduationYear?: number | null;
  address?: string | null;
  parentGuardian?: string | null;
  emergencyContact?: string | null;
  school?: string | null;
  bio?: string | null;
  dominantHand?: string | null;
  memberSince?: string | null;
  attendancePct?: number | null;
  overallRating?: number | null;
  developmentRating?: number | null;
  basketballIQ?: number | null;
  leadershipRating?: number | null;
  athleticismRating?: number | null;
  shootingRating?: number | null;
  defenseRating?: number | null;
  ballHandlingRating?: number | null;
  strengthRating?: number | null;
  division?: string | null;
  ageGroup?: string | null;
  currentTeamId?: string | null;
  homeFacilityName?: string | null;
  tags?: string[];
  gameSeasonStats?: GameSeasonStats | null;
  gameLog?: PlayerGameLogEntry[] | null;
}

export interface TeamDoc {
  id: string;
  enterpriseId: string;
  tenantId: string;
  name: string;
  organizationId: string;
  ageGroup: string;
  division: string;
  seasonId: string;
  headCoachParticipantId?: string | null;
  headCoachName?: string | null;
  assistantCoachName?: string | null;
  teamManagerName?: string | null;
  playerCount: number;
  status: "active" | "pending" | "inactive" | "deleted";
  homeFacilityName?: string | null;
  homeBinodeId?: string | null;
  homeCourt?: string | null;
  practiceDays?: string[];
  seasonStats?: { gamesPlayed: number; wins: number; losses: number };
  pointsPerGame?: number | null;
  fieldGoalPct?: number | null;
  threePointPct?: number | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  deletedAt?: string | null;
}

export interface MembershipDoc {
  id: string;
  teamId: string;
  participantId: string;
  participantName: string;
  role: string;
  status: string;
  deletedAt?: string | null;
}

export interface MembershipPlanDoc {
  id: string;
  enterpriseId: string;
  tenantId: string;
  name: string;
  description?: string | null;
  monthlyAmount: number;
  currency: string;
  billingInterval: "monthly";
  status: "active" | "archived";
  deletedAt?: string | null;
}

export interface PlayerMembershipDoc {
  id: string;
  enterpriseId: string;
  tenantId: string;
  participantId: string;
  participantName: string;
  teamId?: string | null;
  teamName?: string | null;
  planId: string;
  planName: string;
  monthlyAmount: number;
  currency: string;
  status: "active" | "paused" | "cancelled" | "expired" | "pending";
  effectiveDate: string;
  nextBillingDate: string;
  autoRenew: boolean;
  pausedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  deletedAt?: string | null;
}

export interface OrganizationDoc {
  id: string;
  name: string;
  organizationType?: string | null;
}

export interface TeamStatsDoc {
  totalTeams: number;
  activeTeams: number;
  teamsThisSeason: number;
  totalCoaches: number;
  previousTotalTeams?: number;
  previousActiveTeams?: number;
  previousTeamsThisSeason?: number;
  previousTotalCoaches?: number;
  updatedAt?: string;
}

export interface DashboardStatsDoc {
  participantPlayers: number;
  organizations: number;
  facilities: number;
  binodes: number;
  teams: number;
  headCoaches: number;
  assistantCoaches: number;
  teamManagers: number;
  practices: number;
  games: number;
  upcomingEvents: number;
  totalRevenue?: number;
  activeMemberships?: number;
  registrations?: number;
  updatedAt?: string;
}

export interface FacilityDoc {
  id: string;
  name: string;
  code?: string;
  displayName?: string;
  city?: string;
  state?: string;
  country?: string;
  status: string;
}

export interface BinodeDoc {
  id: string;
  code: string;
  displayName?: string;
  facilityId?: string;
  facilityName?: string;
  status: string;
}

export interface EventDoc {
  id: string;
  teamId: string;
  teamName?: string;
  type: string;
  title: string;
  location?: string;
  startAt: string;
  endAt?: string;
}

export interface EvaluationDoc {
  id: string;
  participantId: string;
  teamId?: string;
  status: string;
  title?: string;
  rating?: number;
  comments?: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface CommunicationDoc {
  id: string;
  type: string;
  subject: string;
  body: string;
  createdAt: string;
}

export type TournamentStatus = "draft" | "active" | "archived";
export type MatchPhase = "round_robin" | "semifinal" | "championship";
export type MatchStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface TournamentDoc {
  id: string;
  enterpriseId: string;
  tenantId: string;
  title: string;
  date: string;
  startTime: string;
  timesEachTeamPlaysOthers: number;
  lunchBreakMinutes: number;
  breakAfterGame: number;
  totalGames: number;
  rrTotal: number;
  seasonId: string;
  facilityId: string;
  courtId: string;
  gameDurationMin: number;
  slotIntervalMin: number;
  boysTeamIds: string[];
  girlsTeamIds: string[];
  tournamentStatus: TournamentStatus;
  status: string;
  deletedAt?: string | null;
}

export interface TournamentMatchDoc {
  id: string;
  tournamentId: string;
  division: string;
  phase: MatchPhase;
  cycle?: number | null;
  round?: number | null;
  playoffRound?: number | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeSeed?: number | null;
  awaySeed?: number | null;
  slotNumber: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerId?: string | null;
}

export interface TournamentStandingDoc {
  id: string;
  tournamentId: string;
  division: string;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  seed: number;
}
