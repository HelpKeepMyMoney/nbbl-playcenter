import * as fs from "fs";
import * as path from "path";
import { buildCircuit1SimulationStats } from "./seed-data/build-circuit1-simulation-stats";
import { serializePlayerStatsSeed } from "../tournaments/lib/player-stats-seed-export";
import { serializeTeamStatsSeed } from "../tournaments/lib/team-stats-seed-export";
import {
  normalizePlayoffPlaceholders,
  readTournamentsFromSeedFile,
  serializeTournamentsSeed,
} from "../tournaments/lib/seed-export";

function main() {
  const seedDir = path.resolve(__dirname, "../../src/scripts/seed-data");
  const { tournaments, playerStats, teamStats, completedMatchCount } =
    buildCircuit1SimulationStats();

  const rescoredById = new Map(
    tournaments.map((tournament) => [
      tournament.id,
      normalizePlayoffPlaceholders(tournament),
    ])
  );
  fs.writeFileSync(
    path.join(seedDir, "circuit1-tournaments.ts"),
    serializeTournamentsSeed(
      readTournamentsFromSeedFile(path.join(seedDir, "circuit1-tournaments.ts")).map(
        (entry) => rescoredById.get(entry.id) ?? entry
      )
    ),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(seedDir, "circuit1-player-stats.ts"),
    serializePlayerStatsSeed(playerStats),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(seedDir, "circuit1-team-stats.ts"),
    serializeTeamStatsSeed(teamStats),
    "utf-8"
  );

  const sample = playerStats["player_storm_01"];
  const sampleMinutes =
    sample?.gameLog.map((entry) => entry.min).join(", ") ?? "n/a";
  const sampleScores =
    sample?.gameLog
      .slice(0, 3)
      .map((entry) => entry.result)
      .join(", ") ?? "n/a";

  console.log("Regenerated Circuit 1 simulation seed data.");
  console.log(`  Matches rescored: ${completedMatchCount}`);
  console.log(`  Players updated: ${Object.keys(playerStats).length}`);
  console.log(
    `  Sample (Marcus Allen) games: ${sample?.gameSeasonStats.gamesPlayed ?? 0}`
  );
  console.log(`  Sample minutes: ${sampleMinutes}`);
  console.log(`  Sample results: ${sampleScores}`);
}

main();
