import { describe, expect, it } from "vitest";

import { createDemoEventState } from "./seed";

describe("PartyMaker bundled event content", () => {
  const state = createDemoEventState();
  const cues = Object.values(state.cues);
  const missions = Object.values(state.missions);
  const interactions = Object.values(state.interactions);
  const modules = Object.values(state.modules ?? {});

  it("fills every stage with an operable multi-cue program", () => {
    expect(state.stageOrder).toHaveLength(9);
    expect(cues).toHaveLength(37);
    expect(missions).toHaveLength(10);
    expect(interactions).toHaveLength(12);
    expect(modules).toHaveLength(13);

    const orderedCueIds = state.stageOrder.flatMap((stageId) => {
      const stage = state.stages[stageId];
      expect(stage.description?.trim().length).toBeGreaterThan(10);
      expect(stage.cueOrder.length).toBeGreaterThanOrEqual(3);
      return stage.cueOrder;
    });

    expect(new Set(orderedCueIds).size).toBe(orderedCueIds.length);
    expect(new Set(orderedCueIds)).toEqual(new Set(Object.keys(state.cues)));
  });

  it("keeps every cue attached to its declared stage and audience", () => {
    for (const stageId of state.stageOrder) {
      for (const cueId of state.stages[stageId].cueOrder) {
        const cue = state.cues[cueId];
        expect(cue, cueId).toBeDefined();
        expect(cue.stageId).toBe(stageId);
        expect(cue.audience.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps mission and interaction payload references bidirectional", () => {
    for (const mission of missions) {
      const cue = state.cues[mission.cueId];
      expect(cue, mission.id).toBeDefined();
      expect(cue.payload).toEqual({ kind: "mission", missionId: mission.id });
      expect(mission.description.trim().length).toBeGreaterThan(20);
      expect(mission.points).toBeGreaterThan(0);
    }

    for (const interaction of interactions) {
      const cue = cues.find(
        (candidate) =>
          candidate.payload.kind === "interaction" &&
          candidate.payload.interactionId === interaction.id,
      );
      expect(cue, interaction.id).toBeDefined();
      expect(interaction.prompt.trim().length).toBeGreaterThan(10);
      expect(interaction.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(interaction.options.map((option) => option.id)).size).toBe(
        interaction.options.length,
      );
      if (interaction.correctOptionId) {
        expect(interaction.options.some((option) => option.id === interaction.correctOptionId)).toBe(true);
        expect(interaction.scoring?.correct).toBeGreaterThan(0);
      }
    }
  });

  it("keeps bundled modules attached to valid stages and cues", () => {
    for (const instance of modules) {
      expect(state.stages[instance.stageId], instance.id).toBeDefined();
      if (instance.cueId) {
        expect(state.cues[instance.cueId], instance.id).toBeDefined();
        expect(state.cues[instance.cueId].stageId).toBe(instance.stageId);
      }
      if (instance.config.kind === "timer") {
        expect(instance.timer?.durationMs).toBe(instance.config.durationSeconds * 1_000);
        expect(instance.timer?.status).toBe("idle");
      }
    }
    expect(modules.filter((instance) => instance.definitionId === "team-score")).toHaveLength(1);
  });

  it("contains no unfinished placeholder copy", () => {
    const copy = JSON.stringify(state);
    expect(copy).not.toMatch(/TODO|TBD|lorem ipsum|placeholder/i);
  });
});
