import type { GameSeasonStats, PlayerGameLogEntry } from "@nbbl/shared";

export interface PlayerStatistics {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  minutesPerGame: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalMinutes: number;
  fgMade: number;
  fgAtt: number;
  fgPct: number;
  threeMade: number;
  threeAtt: number;
  threePct: number;
  bestGame: { pts: number; opponent: string; date: string } | null;
  scoringTrend: { date: string; opponent: string; pts: number; win: boolean }[];
  hasData: boolean;
}

function pct(made: number, att: number): number {
  return att > 0 ? Number(((made / att) * 100).toFixed(1)) : 0;
}

export function computePlayerStatistics(
  gameLog: PlayerGameLogEntry[] | null | undefined,
  seasonStats?: GameSeasonStats | null
): PlayerStatistics {
  const entries = gameLog ?? [];

  if (entries.length === 0) {
    if (seasonStats && seasonStats.gamesPlayed > 0) {
      return {
        gamesPlayed: seasonStats.gamesPlayed,
        wins: 0,
        losses: 0,
        winPct: 0,
        pointsPerGame: seasonStats.pointsPerGame,
        reboundsPerGame: seasonStats.reboundsPerGame,
        assistsPerGame: seasonStats.assistsPerGame,
        stealsPerGame: 0,
        minutesPerGame: 0,
        totalPoints: 0,
        totalRebounds: 0,
        totalAssists: 0,
        totalSteals: 0,
        totalMinutes: 0,
        fgMade: 0,
        fgAtt: 0,
        fgPct: 0,
        threeMade: 0,
        threeAtt: 0,
        threePct: 0,
        bestGame: null,
        scoringTrend: [],
        hasData: true,
      };
    }

    return {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winPct: 0,
      pointsPerGame: 0,
      reboundsPerGame: 0,
      assistsPerGame: 0,
      stealsPerGame: 0,
      minutesPerGame: 0,
      totalPoints: 0,
      totalRebounds: 0,
      totalAssists: 0,
      totalSteals: 0,
      totalMinutes: 0,
      fgMade: 0,
      fgAtt: 0,
      fgPct: 0,
      threeMade: 0,
      threeAtt: 0,
      threePct: 0,
      bestGame: null,
      scoringTrend: [],
      hasData: false,
    };
  }

  const gp = entries.length;
  const wins = entries.filter((e) => e.win).length;
  const losses = gp - wins;

  const totals = entries.reduce(
    (acc, e) => ({
      pts: acc.pts + e.pts,
      reb: acc.reb + e.reb,
      ast: acc.ast + e.ast,
      stl: acc.stl + e.stl,
      min: acc.min + e.min,
      fgMade: acc.fgMade + e.fgMade,
      fgAtt: acc.fgAtt + e.fgAtt,
      threeMade: acc.threeMade + e.threeMade,
      threeAtt: acc.threeAtt + e.threeAtt,
    }),
    { pts: 0, reb: 0, ast: 0, stl: 0, min: 0, fgMade: 0, fgAtt: 0, threeMade: 0, threeAtt: 0 }
  );

  const bestEntry = entries.reduce(
    (best, e) => (e.pts > best.pts ? e : best),
    entries[0]!
  );

  const scoringTrend = [...entries]
    .reverse()
    .map((e) => ({
      date: e.date,
      opponent: e.opponent,
      pts: e.pts,
      win: e.win,
    }));

  return {
    gamesPlayed: gp,
    wins,
    losses,
    winPct: Number(((wins / gp) * 100).toFixed(1)),
    pointsPerGame: Number((totals.pts / gp).toFixed(1)),
    reboundsPerGame: Number((totals.reb / gp).toFixed(1)),
    assistsPerGame: Number((totals.ast / gp).toFixed(1)),
    stealsPerGame: Number((totals.stl / gp).toFixed(1)),
    minutesPerGame: Number((totals.min / gp).toFixed(1)),
    totalPoints: totals.pts,
    totalRebounds: totals.reb,
    totalAssists: totals.ast,
    totalSteals: totals.stl,
    totalMinutes: totals.min,
    fgMade: totals.fgMade,
    fgAtt: totals.fgAtt,
    fgPct: pct(totals.fgMade, totals.fgAtt),
    threeMade: totals.threeMade,
    threeAtt: totals.threeAtt,
    threePct: pct(totals.threeMade, totals.threeAtt),
    bestGame: {
      pts: bestEntry.pts,
      opponent: bestEntry.opponent,
      date: bestEntry.date,
    },
    scoringTrend,
    hasData: true,
  };
}
