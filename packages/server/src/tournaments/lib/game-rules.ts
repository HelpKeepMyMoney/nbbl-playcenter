/** NBBL game format: 7-minute running clock with real-time substitutions. */
export const GAME_LENGTH_MINUTES = 7;
export const PLAYERS_ON_COURT = 5;

/** Total on-court minutes per team per game (5 players × 7 minutes). */
export const TEAM_COURT_MINUTES = GAME_LENGTH_MINUTES * PLAYERS_ON_COURT;

/** Typical team scores in a 7-minute running-clock game. */
export const MIN_TEAM_SCORE = 12;
export const MAX_TEAM_SCORE = 26;

export function generateGameScore(
  teamId: string,
  slotNumber: number,
  salt = 0
): number {
  const range = MAX_TEAM_SCORE - MIN_TEAM_SCORE + 1;
  return MIN_TEAM_SCORE + ((slotNumber * 7 + teamId.length + salt) % range);
}
