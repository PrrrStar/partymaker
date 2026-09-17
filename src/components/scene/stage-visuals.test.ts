import { describe, expect, it } from "vitest";

import { STAGE_SCENE_IDS, resolveStageVisual } from "./stage-visuals";

describe("PartyMaker stage visuals", () => {
  it("defines a distinct camera and valid palette for every seeded stage", () => {
    const cameras = STAGE_SCENE_IDS.map((stageId) => {
      const visual = resolveStageVisual(stageId);
      expect(visual.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(visual.secondary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(visual.camera).toHaveLength(3);
      return visual.camera.join(":");
    });

    expect(new Set(cameras).size).toBe(STAGE_SCENE_IDS.length);
  });

  it("falls back safely for unknown stages", () => {
    expect(resolveStageVisual("stage-unknown")).toEqual(
      resolveStageVisual("stage-check-in"),
    );
  });

  it("raises energy for reveals and clamps participant growth", () => {
    const open = resolveStageVisual(
      "stage-telepathy",
      "interaction",
      "open",
      10,
    );
    const revealed = resolveStageVisual(
      "stage-telepathy",
      "interaction",
      "revealed",
      10,
    );

    expect(revealed.energy).toBeGreaterThan(open.energy);
    expect(resolveStageVisual("stage-finale", "leaderboard", undefined, 500).growth).toBe(1);
    expect(resolveStageVisual("stage-check-in", "standby", undefined, -10).growth).toBe(0.28);
  });
});
