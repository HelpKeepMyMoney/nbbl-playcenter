export interface TeamRef {
  id: string;
  name: string;
}

export interface RoundRobinMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  cycle: number;
  round: number;
}

/**
 * Circle method for 4 teams. Produces 3 rounds × 2 games = 6 per cycle.
 * Repeats for `cycles` with home/away swapped on odd cycles.
 */
export function generateRoundRobin(
  teams: TeamRef[],
  cycles: number
): RoundRobinMatch[] {
  if (teams.length !== 4) {
    throw new Error("Round-robin requires exactly 4 teams per division");
  }

  const [a, b, c, d] = teams;
  const roundPairings: [TeamRef, TeamRef][] = [
    [a, d],
    [b, c],
    [a, c],
    [d, b],
    [a, b],
    [c, d],
  ];

  const matches: RoundRobinMatch[] = [];

  for (let cycle = 1; cycle <= cycles; cycle++) {
    const swapHomeAway = cycle % 2 === 0;
    let round = 1;
    for (let i = 0; i < roundPairings.length; i += 2) {
      const pair1 = roundPairings[i];
      const pair2 = roundPairings[i + 1];

      for (const [home, away] of [pair1, pair2]) {
        const h = swapHomeAway ? away : home;
        const aw = swapHomeAway ? home : away;
        matches.push({
          homeTeamId: h.id,
          awayTeamId: aw.id,
          homeTeamName: h.name,
          awayTeamName: aw.name,
          cycle,
          round,
        });
      }
      round += 1;
    }
  }

  return matches;
}
