import type { Firestore } from "firebase-admin/firestore";
import type {
  GameSeasonStats,
  PlayerGameLogEntry,
} from "@nbbl/shared";
import type { SimulatedMatch } from "./simulate-tournament";
import {
  GAME_LENGTH_MINUTES,
  PLAYERS_ON_COURT,
} from "./game-rules";

export interface PlayerInfo {
  id: string;
  teamId: string;
  overallRating: number;
}

export interface PlayerBoxScore {
  participantId: string;
  teamId: string;
  entry: PlayerGameLogEntry;
}

function hashSeed(parts: string[]): number {
  let h = 0;
  const s = parts.join(":");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededUnit(seed: number, salt: number): number {
  const x = Math.sin((seed * 31 + salt * 17) | 0) * 10000;
  return x - Math.floor(x);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Models real-time substitutions across a 7-minute running clock.
 * Each minute, five players are on court; lineups rotate in the middle
 * and the starting five typically closes the game.
 */
function distributePlayingTime(
  players: PlayerInfo[],
  matchId: string
): Map<string, number> {
  const minutes = new Map<string, number>();
  for (const p of players) {
    minutes.set(p.id, 0);
  }
  if (players.length === 0) return minutes;

  const ranked = [...players]
    .map((p) => ({
      id: p.id,
      weight: p.overallRating + (hashSeed([p.id, matchId]) % 10),
    }))
    .sort((a, b) => b.weight - a.weight);

  if (ranked.length <= PLAYERS_ON_COURT) {
    for (const p of ranked) {
      minutes.set(p.id, GAME_LENGTH_MINUTES);
    }
    return minutes;
  }

  const starters = ranked.slice(0, PLAYERS_ON_COURT);
  const bench = ranked.slice(PLAYERS_ON_COURT);

  for (let minute = 0; minute < GAME_LENGTH_MINUTES; minute++) {
    const lineup = pickLineupForMinute(starters, bench, minute, matchId);
    for (const id of lineup) {
      minutes.set(id, (minutes.get(id) ?? 0) + 1);
    }
  }

  return minutes;
}

function pickLineupForMinute(
  starters: { id: string; weight: number }[],
  bench: { id: string; weight: number }[],
  minute: number,
  matchId: string
): string[] {
  // Opening minutes: starting five on the floor.
  if (minute <= 1) {
    return starters.map((p) => p.id);
  }

  // Closing minutes: starters return for the finish.
  if (minute >= GAME_LENGTH_MINUTES - 2) {
    return starters.map((p) => p.id);
  }

  // Middle minutes: running-clock substitutions — rotate two bench players in.
  const subsToInsert = Math.min(2, bench.length);
  const rotationBase =
    hashSeed([matchId, String(minute)]) % Math.max(1, bench.length);
  const subs: string[] = [];
  for (let i = 0; i < subsToInsert; i++) {
    subs.push(bench[(rotationBase + i + minute - 2) % bench.length]!.id);
  }

  const kept = starters
    .slice(0, PLAYERS_ON_COURT - subsToInsert)
    .map((p) => p.id);
  return [...kept, ...subs];
}

function distributePoints(
  teamScore: number,
  players: PlayerInfo[],
  matchId: string,
  slotNumber: number,
  playingTime: Map<string, number>
): Map<string, number> {
  const activePlayers = players.filter((p) => (playingTime.get(p.id) ?? 0) > 0);
  const points = new Map<string, number>();
  for (const p of players) {
    points.set(p.id, 0);
  }

  if (activePlayers.length === 0 || teamScore === 0) {
    return points;
  }

  const scorers = activePlayers
    .map((p) => ({
      id: p.id,
      weight:
        (p.overallRating + (hashSeed([p.id, matchId]) % 15)) *
        (playingTime.get(p.id) ?? 1),
    }))
    .sort((a, b) => b.weight - a.weight);

  const activeCount = Math.max(
    3,
    Math.min(scorers.length, 4 + (slotNumber % 2))
  );
  const active = scorers.slice(0, activeCount);
  const totalWeight = active.reduce((sum, p) => sum + p.weight, 0);

  let allocated = 0;
  for (let i = 0; i < active.length; i++) {
    const p = active[i]!;
    if (i === active.length - 1) {
      points.set(p.id, Math.max(0, teamScore - allocated));
    } else {
      const share = Math.floor((teamScore * p.weight) / totalWeight);
      const pts = Math.max(0, share);
      points.set(p.id, pts);
      allocated += pts;
    }
  }

  return points;
}

function generateBoxScore(
  player: PlayerInfo,
  match: SimulatedMatch,
  teamId: string,
  pts: number,
  minutesPlayed: number,
  tournamentId: string
): PlayerGameLogEntry {
  const seed = hashSeed([player.id, match.id, String(match.slotNumber)]);
  const isHome = match.homeTeamId === teamId;
  const teamScore = isHome ? match.homeScore : match.awayScore;
  const oppScore = isHome ? match.awayScore : match.homeScore;
  const win = match.winnerId === teamId;
  const opponent = isHome ? match.awayTeamName : match.homeTeamName;

  const min = minutesPlayed;

  if (min === 0) {
    return {
      matchId: match.id,
      tournamentId,
      date: formatDate(match.scheduledStartAt),
      opponent,
      result: `${win ? "W" : "L"} ${teamScore}-${oppScore}`,
      win,
      min: 0,
      pts: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      fgMade: 0,
      fgAtt: 0,
      threeMade: 0,
      threeAtt: 0,
    };
  }

  // Scale counting stats to minutes played in a 7-minute game.
  const reb = Math.min(
    4,
    Math.floor(min * 0.35 + seededUnit(seed, 2) * 1.5)
  );
  const ast = Math.min(
    3,
    Math.floor(min * 0.25 + seededUnit(seed, 3) * 1.2)
  );
  const stl = Math.min(
    2,
    Math.floor(min * 0.12 + seededUnit(seed, 4) * 1.5)
  );
  const fgAtt = Math.max(
    pts > 0 ? 1 : 0,
    Math.floor(min * 0.8 + pts * 0.5 + seededUnit(seed, 5) * 2)
  );
  const fgMade = Math.min(
    fgAtt,
    Math.max(0, Math.floor(fgAtt * (0.35 + seededUnit(seed, 6) * 0.35)))
  );
  const threeAtt = Math.min(fgAtt, Math.floor(min * 0.4 + seededUnit(seed, 7) * 2));
  const threeMade =
    threeAtt > 0
      ? Math.min(
          threeAtt,
          Math.floor(threeAtt * (0.2 + seededUnit(seed, 8) * 0.45))
        )
      : 0;

  return {
    matchId: match.id,
    tournamentId,
    date: formatDate(match.scheduledStartAt),
    opponent,
    result: `${win ? "W" : "L"} ${teamScore}-${oppScore}`,
    win,
    min,
    pts,
    reb,
    ast,
    stl,
    fgMade,
    fgAtt,
    threeMade,
    threeAtt,
  };
}

export function aggregateSeasonStats(entries: PlayerGameLogEntry[]): GameSeasonStats {
  if (entries.length === 0) {
    return {
      gamesPlayed: 0,
      pointsPerGame: 0,
      reboundsPerGame: 0,
      assistsPerGame: 0,
    };
  }
  const gamesPlayed = entries.length;
  const totals = entries.reduce(
    (acc, e) => ({
      pts: acc.pts + e.pts,
      reb: acc.reb + e.reb,
      ast: acc.ast + e.ast,
    }),
    { pts: 0, reb: 0, ast: 0 }
  );
  return {
    gamesPlayed,
    pointsPerGame: Number((totals.pts / gamesPlayed).toFixed(1)),
    reboundsPerGame: Number((totals.reb / gamesPlayed).toFixed(1)),
    assistsPerGame: Number((totals.ast / gamesPlayed).toFixed(1)),
  };
}

async function loadPlayersByTeam(
  db: Firestore,
  tenantId: string,
  teamIds: string[]
): Promise<Map<string, PlayerInfo[]>> {
  const result = new Map<string, PlayerInfo[]>();
  for (const teamId of teamIds) {
    result.set(teamId, []);
  }

  const snap = await db
    .collection("memberships")
    .where("tenantId", "==", tenantId)
    .where("role", "==", "player")
    .where("deletedAt", "==", null)
    .get();

  const participantIds = new Set<string>();
  const teamPlayers = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const data = doc.data();
    const teamId = data.teamId as string;
    if (!teamIds.includes(teamId)) continue;
    const participantId = data.participantId as string;
    participantIds.add(participantId);
    const list = teamPlayers.get(teamId) ?? [];
    list.push(participantId);
    teamPlayers.set(teamId, list);
  }

  const participantSnaps = await Promise.all(
    [...participantIds].map((id) => db.collection("participants").doc(id).get())
  );
  const participantMap = new Map(
    participantSnaps
      .filter((s) => s.exists)
      .map((s) => {
        const data = s.data()!;
        return [
          s.id,
          {
            id: s.id,
            overallRating: (data.overallRating as number) ?? 75,
          },
        ] as const;
      })
  );

  for (const [teamId, playerIds] of teamPlayers) {
    const players: PlayerInfo[] = playerIds
      .map((id) => {
        const p = participantMap.get(id);
        if (!p) return null;
        return { id: p.id, teamId, overallRating: p.overallRating };
      })
      .filter(Boolean) as PlayerInfo[];
    result.set(teamId, players);
  }

  return result;
}

export async function removePlayerStatsForTournament(
  db: Firestore,
  tenantId: string,
  actorId: string,
  tournamentId: string,
  teamIds: string[]
): Promise<number> {
  const playersByTeam = await loadPlayersByTeam(db, tenantId, teamIds);
  const allPlayerIds = [...playersByTeam.values()].flat().map((p) => p.id);
  if (allPlayerIds.length === 0) return 0;

  let updatedCount = 0;
  const batchSize = 400;

  for (let i = 0; i < allPlayerIds.length; i += batchSize) {
    const batch = db.batch();
    const chunk = allPlayerIds.slice(i, i + batchSize);
    const snaps = await Promise.all(
      chunk.map((id) => db.collection("participants").doc(id).get())
    );

    let chunkUpdated = false;
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data()!;
      const gameLog = (data.gameLog ?? []) as PlayerGameLogEntry[];
      const filtered = gameLog.filter((e) => e.tournamentId !== tournamentId);
      if (filtered.length === gameLog.length) continue;

      batch.update(snap.ref, {
        gameLog: filtered,
        gameSeasonStats: aggregateSeasonStats(filtered),
        updatedAt: new Date().toISOString(),
        updatedBy: actorId,
      });
      chunkUpdated = true;
      updatedCount++;
    }

    if (chunkUpdated) {
      await batch.commit();
    }
  }

  return updatedCount;
}

export async function resetPlayerGameStats(
  db: Firestore,
  participantIds: string[],
  actorId: string
): Promise<void> {
  const batchSize = 400;
  for (let i = 0; i < participantIds.length; i += batchSize) {
    const batch = db.batch();
    const chunk = participantIds.slice(i, i + batchSize);
    for (const id of chunk) {
      batch.update(db.collection("participants").doc(id), {
        gameSeasonStats: {
          gamesPlayed: 0,
          pointsPerGame: 0,
          reboundsPerGame: 0,
          assistsPerGame: 0,
        },
        gameLog: [],
        updatedAt: new Date().toISOString(),
        updatedBy: actorId,
      });
    }
    await batch.commit();
  }
}

export async function simulatePlayerStats(
  db: Firestore,
  tenantId: string,
  actorId: string,
  tournamentId: string,
  teamIds: string[],
  matches: SimulatedMatch[]
): Promise<Map<string, { gameSeasonStats: GameSeasonStats; gameLog: PlayerGameLogEntry[] }>> {
  const playersByTeam = await loadPlayersByTeam(db, tenantId, teamIds);
  const allPlayerIds = [...playersByTeam.values()].flat().map((p) => p.id);
  await resetPlayerGameStats(db, allPlayerIds, actorId);

  const results = computePlayerStatsFromMatches(
    playersByTeam,
    matches,
    tournamentId
  );

  const batchSize = 400;
  const entries = [...results.entries()];
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + batchSize);
    for (const [participantId, stats] of chunk) {
      batch.update(db.collection("participants").doc(participantId), {
        gameSeasonStats: stats.gameSeasonStats,
        gameLog: stats.gameLog,
        updatedAt: new Date().toISOString(),
        updatedBy: actorId,
      });
    }
    await batch.commit();
  }

  return results;
}

export function computePlayerStatsFromMatches(
  playersByTeam: Map<string, PlayerInfo[]>,
  matches: SimulatedMatch[],
  tournamentId: string
): Map<string, { gameSeasonStats: GameSeasonStats; gameLog: PlayerGameLogEntry[] }> {
  const allPlayerIds = [...playersByTeam.values()].flat().map((p) => p.id);
  const gameLogs = new Map<string, PlayerGameLogEntry[]>();
  for (const id of allPlayerIds) {
    gameLogs.set(id, []);
  }

  for (const match of matches) {
    for (const [teamId, teamScore] of [
      [match.homeTeamId, match.homeScore] as const,
      [match.awayTeamId, match.awayScore] as const,
    ]) {
      const players = playersByTeam.get(teamId) ?? [];
      if (players.length === 0) continue;

      const playingTime = distributePlayingTime(players, match.id);
      const points = distributePoints(
        teamScore,
        players,
        match.id,
        match.slotNumber,
        playingTime
      );

      for (const player of players) {
        const min = playingTime.get(player.id) ?? 0;
        const pts = points.get(player.id) ?? 0;
        const entry = generateBoxScore(
          player,
          match,
          teamId,
          pts,
          min,
          tournamentId
        );
        gameLogs.get(player.id)!.push(entry);
      }
    }
  }

  const results = new Map<
    string,
    { gameSeasonStats: GameSeasonStats; gameLog: PlayerGameLogEntry[] }
  >();

  for (const [participantId, log] of gameLogs) {
    const sortedLog = [...log].sort(
      (a, b) => b.date.localeCompare(a.date) || b.matchId.localeCompare(a.matchId)
    );
    results.set(participantId, {
      gameSeasonStats: aggregateSeasonStats(sortedLog),
      gameLog: sortedLog,
    });
  }

  return results;
}

function sortGameLog(entries: PlayerGameLogEntry[]): PlayerGameLogEntry[] {
  return [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.matchId.localeCompare(a.matchId)
  );
}

export function mergePlayerStatsMaps(
  target: Map<
    string,
    { gameSeasonStats: GameSeasonStats; gameLog: PlayerGameLogEntry[] }
  >,
  addition: Map<
    string,
    { gameSeasonStats: GameSeasonStats; gameLog: PlayerGameLogEntry[] }
  >
): void {
  for (const [playerId, stats] of addition) {
    const existing = target.get(playerId);
    if (!existing) {
      target.set(playerId, {
        gameLog: sortGameLog(stats.gameLog),
        gameSeasonStats: stats.gameSeasonStats,
      });
      continue;
    }

    const mergedLog = sortGameLog([...existing.gameLog, ...stats.gameLog]);
    target.set(playerId, {
      gameLog: mergedLog,
      gameSeasonStats: aggregateSeasonStats(mergedLog),
    });
  }
}

export function collectBoxScoresByTeam(
  playerStats: Map<string, { gameSeasonStats: GameSeasonStats; gameLog: PlayerGameLogEntry[] }>,
  playersByTeam: Map<string, PlayerInfo[]>
): Map<string, PlayerGameLogEntry[]> {
  const byTeam = new Map<string, PlayerGameLogEntry[]>();
  for (const [teamId, players] of playersByTeam) {
    const entries: PlayerGameLogEntry[] = [];
    for (const player of players) {
      const stats = playerStats.get(player.id);
      if (stats) entries.push(...stats.gameLog);
    }
    byTeam.set(teamId, entries);
  }
  return byTeam;
}

export { loadPlayersByTeam };
