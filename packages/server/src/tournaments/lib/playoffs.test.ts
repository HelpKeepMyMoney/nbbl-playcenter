import { describe, expect, it } from "vitest";
import {
  buildPlayoffMatchups,
  findPlayoffMatchBySeeds,
} from "./playoffs";

describe("buildPlayoffMatchups", () => {
  it("pairs seed 1 vs 4 and seed 2 vs 3", () => {
    const seeds = [
      { teamId: "t1", teamName: "One", seed: 1 },
      { teamId: "t2", teamName: "Two", seed: 2 },
      { teamId: "t3", teamName: "Three", seed: 3 },
      { teamId: "t4", teamName: "Four", seed: 4 },
    ];

    const matchups = buildPlayoffMatchups(seeds);
    expect(matchups).toHaveLength(2);
    expect(matchups[0]).toMatchObject({
      homeTeamId: "t1",
      awayTeamId: "t4",
      homeSeed: 1,
      awaySeed: 4,
    });
    expect(matchups[1]).toMatchObject({
      homeTeamId: "t2",
      awayTeamId: "t3",
      homeSeed: 2,
      awaySeed: 3,
    });
  });
});

describe("findPlayoffMatchBySeeds", () => {
  it("finds the semifinal slot by seed pairing", () => {
    const matches = [
      {
        division: "Boys Division",
        phase: "semifinal",
        homeSeed: 2,
        awaySeed: 3,
        slotNumber: 51,
      },
      {
        division: "Boys Division",
        phase: "semifinal",
        homeSeed: 1,
        awaySeed: 4,
        slotNumber: 49,
      },
    ];

    const oneVsFour = findPlayoffMatchBySeeds(
      matches,
      "Boys Division",
      "semifinal",
      1,
      4
    );
    expect(oneVsFour?.slotNumber).toBe(49);
  });
});
