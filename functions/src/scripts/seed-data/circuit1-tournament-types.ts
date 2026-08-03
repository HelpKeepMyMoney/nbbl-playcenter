export interface SeedTournamentData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  timesEachTeamPlaysOthers: number;
  lunchBreakMinutes: number;
  breakAfterGame: number;
  totalGames: number;
  seasonId: string;
  facilityId: string;
  courtId: string;
  status: string;
  boysTeamIds: string[];
  girlsTeamIds: string[];
  matches: SeedMatchData[];
}

export interface SeedMatchData {
  division: string;
  phase: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  slotNumber: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  cycle?: number;
  round?: number;
  playoffRound?: number;
  homeSeed?: number | null;
  awaySeed?: number | null;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string | null;
}
