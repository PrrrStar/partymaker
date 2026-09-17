import type { EventCommand } from "./commands";
import { DomainError, invariant } from "./errors";
import { createDemoEventState } from "./seed";
import type {
  Cue,
  EventState,
  Guest,
  Interaction,
  MissionAudience,
  ScoreTarget,
} from "./types";

export interface ReduceContext {
  commandId: string;
  now: string;
}

export interface ReduceResult {
  state: EventState;
  changed: boolean;
  result?: Record<string, unknown>;
}

function noChange(
  state: EventState,
  result?: Record<string, unknown>,
): ReduceResult {
  return { state, changed: false, result };
}

function changed(
  state: EventState,
  result?: Record<string, unknown>,
): ReduceResult {
  return { state, changed: true, result };
}

function copyState(state: EventState): EventState {
  return structuredClone(state);
}

function cleanText(value: unknown, field: string, maxLength: number): string {
  invariant(typeof value === "string", "invalid-command", `${field} must be a string.`);
  const cleaned = value.trim();
  invariant(cleaned.length > 0, "invalid-command", `${field} is required.`);
  invariant(
    cleaned.length <= maxLength,
    "invalid-command",
    `${field} must be ${maxLength} characters or fewer.`,
  );
  return cleaned;
}

function appendHistory(
  state: EventState,
  stageId: string,
  cueId: string | null,
  now: string,
): void {
  const previous = state.runtime.history.at(-1);
  if (previous?.stageId === stageId && previous.cueId === cueId) {
    return;
  }

  state.runtime.history.push({ stageId, cueId, activatedAt: now });
  if (state.runtime.history.length > 100) {
    state.runtime.history.splice(0, state.runtime.history.length - 100);
  }
}

function activateCue(state: EventState, cueId: string, now: string): boolean {
  const cue = state.cues[cueId];
  invariant(cue, "cue-not-found", `Cue ${cueId} does not exist.`, 404);
  invariant(cue.status !== "skipped", "cue-skipped", "A skipped cue cannot be activated.");

  if (
    state.runtime.activeCueId === cueId &&
    state.runtime.activeStageId === cue.stageId &&
    state.runtime.screenOverride === null
  ) {
    return false;
  }

  state.runtime.activeStageId = cue.stageId;
  state.runtime.activeCueId = cueId;
  state.runtime.screenOverride = null;
  appendHistory(state, cue.stageId, cueId, now);
  return true;
}

function orderedCueIds(state: EventState): string[] {
  return state.stageOrder.flatMap((stageId) => state.stages[stageId]?.cueOrder ?? []);
}

function findNextCueId(state: EventState, currentCueId: string | null): string | null {
  const cueIds = orderedCueIds(state);

  if (currentCueId === null) {
    const activeStage = state.runtime.activeStageId
      ? state.stages[state.runtime.activeStageId]
      : undefined;
    const candidates = activeStage?.cueOrder ?? cueIds;
    return candidates.find((cueId) => state.cues[cueId]?.status !== "skipped") ?? null;
  }

  const currentIndex = cueIds.indexOf(currentCueId);
  return (
    cueIds
      .slice(Math.max(0, currentIndex + 1))
      .find((cueId) => state.cues[cueId]?.status !== "skipped") ?? null
  );
}

function insertId(order: string[], id: string, afterId?: string | null): void {
  if (afterId === null) {
    order.unshift(id);
    return;
  }
  if (afterId === undefined) {
    order.push(id);
    return;
  }

  const index = order.indexOf(afterId);
  invariant(index >= 0, "cue-not-found", `Cue ${afterId} is not in the target stage.`, 404);
  order.splice(index + 1, 0, id);
}

function validateCuePayload(state: EventState, cue: Pick<Cue, "payload">): void {
  if (cue.payload.kind === "mission") {
    invariant(
      state.missions[cue.payload.missionId],
      "mission-not-found",
      `Mission ${cue.payload.missionId} does not exist.`,
      404,
    );
  }
  if (cue.payload.kind === "interaction") {
    invariant(
      state.interactions[cue.payload.interactionId],
      "interaction-not-found",
      `Interaction ${cue.payload.interactionId} does not exist.`,
      404,
    );
  }
}

function validateInteraction(interaction: Interaction): void {
  cleanText(interaction.id, "interaction.id", 100);
  cleanText(interaction.prompt, "interaction.prompt", 240);
  invariant(
    Array.isArray(interaction.options) && interaction.options.length >= 2,
    "invalid-interaction",
    "An interaction needs at least two options.",
  );
  const optionIds = new Set<string>();
  for (const option of interaction.options) {
    cleanText(option.id, "option.id", 100);
    cleanText(option.label, "option.label", 80);
    invariant(!optionIds.has(option.id), "invalid-interaction", "Option IDs must be unique.");
    optionIds.add(option.id);
  }
  if (interaction.correctOptionId !== undefined) {
    invariant(
      optionIds.has(interaction.correctOptionId),
      "invalid-interaction",
      "The correct option must exist in the interaction.",
    );
  }
  if (interaction.scoring) {
    invariant(
      Number.isFinite(interaction.scoring.correct) && interaction.scoring.correct >= 0,
      "invalid-interaction",
      "Interaction points must be a non-negative number.",
    );
    invariant(
      interaction.correctOptionId,
      "invalid-interaction",
      "A scored interaction needs a correct option.",
    );
  }
}

function missionAllowsGuest(
  audience: MissionAudience,
  guest: Guest,
): boolean {
  switch (audience.kind) {
    case "all":
      return true;
    case "guests":
      return audience.guestIds.includes(guest.id);
    case "tables":
      return audience.tableIds.includes(guest.tableId);
  }
}

function validateScoreTarget(state: EventState, target: ScoreTarget): void {
  if (target.kind === "guest") {
    invariant(state.guests[target.id], "guest-not-found", `Guest ${target.id} does not exist.`, 404);
  } else {
    invariant(state.tables[target.id], "table-not-found", `Table ${target.id} does not exist.`, 404);
  }
}

function addScoreEvent(
  state: EventState,
  input: {
    sourceKey: string;
    target: ScoreTarget;
    delta: number;
    reason: string;
    now: string;
  },
): boolean {
  if (state.scoreEvents[input.sourceKey]) {
    return false;
  }
  validateScoreTarget(state, input.target);
  state.scoreEvents[input.sourceKey] = {
    id: input.sourceKey,
    sourceKey: input.sourceKey,
    target: input.target,
    delta: input.delta,
    reason: input.reason,
    createdAt: input.now,
  };
  return true;
}

function responseKey(interactionId: string, guestId: string): string {
  return `${interactionId}:${guestId}`;
}

function cueForInteraction(state: EventState, interactionId: string): Cue | undefined {
  return Object.values(state.cues).find(
    (cue) =>
      cue.payload.kind === "interaction" &&
      cue.payload.interactionId === interactionId,
  );
}

function activeCueMatchesInteraction(state: EventState, interactionId: string): boolean {
  const activeCue = state.runtime.activeCueId
    ? state.cues[state.runtime.activeCueId]
    : undefined;
  return (
    activeCue?.payload.kind === "interaction" &&
    activeCue.payload.interactionId === interactionId
  );
}

function guestsEqual(left: Guest, right: Guest): boolean {
  return (
    left.id === right.id &&
    left.displayName === right.displayName &&
    left.side === right.side &&
    left.relationshipCategory === right.relationshipCategory &&
    left.yearsKnown === right.yearsKnown &&
    left.tableId === right.tableId &&
    left.relationshipDescription === right.relationshipDescription &&
    left.consentToDisplay === right.consentToDisplay
  );
}

export function reduceEvent(
  state: EventState,
  command: EventCommand,
  context: ReduceContext,
): ReduceResult {
  switch (command.type) {
    case "event.reset-demo": {
      return changed(createDemoEventState(), { reset: true });
    }

    case "guest.join": {
      const id = cleanText(command.guest.id, "guest.id", 100);
      const displayName = cleanText(command.guest.displayName, "displayName", 30);
      invariant(
        ["groom", "bride", "family", "other"].includes(command.guest.side),
        "invalid-guest",
        "Unknown guest side.",
      );
      invariant(
        ["family", "friend", "work", "school", "club", "military", "other"].includes(
          command.guest.relationshipCategory,
        ),
        "invalid-guest",
        "Unknown relationship category.",
      );
      invariant(
        Number.isFinite(command.guest.yearsKnown) &&
          command.guest.yearsKnown >= 0 &&
          command.guest.yearsKnown <= 100,
        "invalid-guest",
        "yearsKnown must be between 0 and 100.",
      );
      invariant(
        state.tables[command.guest.tableId],
        "table-not-found",
        `Table ${command.guest.tableId} does not exist.`,
        404,
      );
      invariant(
        typeof command.guest.consentToDisplay === "boolean",
        "invalid-guest",
        "consentToDisplay must be a boolean.",
      );

      const relationshipDescription = command.guest.relationshipDescription?.trim();
      invariant(
        !relationshipDescription || relationshipDescription.length <= 100,
        "invalid-guest",
        "relationshipDescription must be 100 characters or fewer.",
      );
      const existing = state.guests[id];
      const guest: Guest = {
        id,
        displayName,
        side: command.guest.side,
        relationshipCategory: command.guest.relationshipCategory,
        yearsKnown: command.guest.yearsKnown,
        tableId: command.guest.tableId,
        relationshipDescription: relationshipDescription || undefined,
        consentToDisplay: command.guest.consentToDisplay,
        joinedAt: existing?.joinedAt ?? context.now,
      };

      if (existing && guestsEqual(existing, guest)) {
        return noChange(state, { guestId: id });
      }
      const next = copyState(state);
      next.guests[id] = guest;
      return changed(next, { guestId: id });
    }

    case "runtime.set-stage": {
      const stage = state.stages[command.stageId];
      invariant(stage, "stage-not-found", `Stage ${command.stageId} does not exist.`, 404);
      const cue = command.cueId ? state.cues[command.cueId] : undefined;
      if (command.cueId) {
        invariant(cue, "cue-not-found", `Cue ${command.cueId} does not exist.`, 404);
        invariant(cue.stageId === stage.id, "invalid-cue", "Cue does not belong to the stage.");
        invariant(cue.status !== "skipped", "cue-skipped", "A skipped cue cannot be activated.");
      }
      const cueId = cue?.id ?? null;
      if (
        state.runtime.activeStageId === stage.id &&
        state.runtime.activeCueId === cueId &&
        state.runtime.screenOverride === null
      ) {
        return noChange(state);
      }
      const next = copyState(state);
      next.runtime.activeStageId = stage.id;
      next.runtime.activeCueId = cueId;
      next.runtime.screenOverride = null;
      appendHistory(next, stage.id, cueId, context.now);
      return changed(next);
    }

    case "runtime.activate-cue": {
      const next = copyState(state);
      return activateCue(next, command.cueId, context.now)
        ? changed(next)
        : noChange(state);
    }

    case "runtime.advance": {
      if (command.direction === "previous") {
        if (state.runtime.history.length < 2) {
          return noChange(state, { atBoundary: true });
        }
        const next = copyState(state);
        next.runtime.history.pop();
        const previous = next.runtime.history.at(-1);
        invariant(previous, "runtime-history-empty", "No previous cue is available.");
        next.runtime.activeStageId = previous.stageId;
        next.runtime.activeCueId = previous.cueId;
        next.runtime.screenOverride = null;
        return changed(next);
      }

      const nextCueId = findNextCueId(state, state.runtime.activeCueId);
      if (!nextCueId) {
        return noChange(state, { atBoundary: true });
      }
      const next = copyState(state);
      if (next.runtime.activeCueId && next.cues[next.runtime.activeCueId]) {
        next.cues[next.runtime.activeCueId].status = "completed";
      }
      activateCue(next, nextCueId, context.now);
      return changed(next);
    }

    case "runtime.set-paused": {
      invariant(typeof command.paused === "boolean", "invalid-command", "paused must be a boolean.");
      if (state.runtime.paused === command.paused) {
        return noChange(state);
      }
      const next = copyState(state);
      next.runtime.paused = command.paused;
      return changed(next);
    }

    case "cue.insert": {
      invariant(!state.cues[command.cue.id], "cue-exists", `Cue ${command.cue.id} already exists.`, 409);
      const stage = state.stages[command.stageId];
      invariant(stage, "stage-not-found", `Stage ${command.stageId} does not exist.`, 404);
      cleanText(command.cue.id, "cue.id", 100);
      const title = cleanText(command.cue.title, "cue.title", 100);
      invariant(
        Array.isArray(command.cue.audience) && command.cue.audience.length > 0,
        "invalid-cue",
        "A cue needs at least one audience.",
      );
      invariant(
        command.cue.audience.every((surface) => surface === "guest" || surface === "screen"),
        "invalid-cue",
        "A cue has an unknown audience.",
      );
      validateCuePayload(state, command.cue);

      const next = copyState(state);
      next.cues[command.cue.id] = {
        ...command.cue,
        title,
        stageId: stage.id,
        audience: [...new Set(command.cue.audience)],
        status: "queued",
        createdAt: context.now,
      };
      insertId(next.stages[stage.id].cueOrder, command.cue.id, command.afterCueId);
      return changed(next, { cueId: command.cue.id });
    }

    case "cue.move": {
      const cue = state.cues[command.cueId];
      invariant(cue, "cue-not-found", `Cue ${command.cueId} does not exist.`, 404);
      invariant(cue.status === "queued", "cue-not-movable", "Only queued cues can be moved.");
      invariant(
        state.runtime.activeCueId !== cue.id,
        "cue-not-movable",
        "The active cue cannot be moved.",
      );
      const targetStage = state.stages[command.stageId];
      invariant(targetStage, "stage-not-found", `Stage ${command.stageId} does not exist.`, 404);
      invariant(command.afterCueId !== cue.id, "invalid-cue-order", "A cue cannot follow itself.");
      if (command.afterCueId) {
        invariant(
          targetStage.cueOrder.includes(command.afterCueId),
          "cue-not-found",
          `Cue ${command.afterCueId} is not in the target stage.`,
          404,
        );
      }
      const sourceOrder = state.stages[cue.stageId]?.cueOrder ?? [];
      const oldIndex = sourceOrder.indexOf(cue.id);
      const samePlacement =
        cue.stageId === targetStage.id &&
        ((command.afterCueId === null && oldIndex === 0) ||
          (command.afterCueId === undefined && oldIndex === sourceOrder.length - 1) ||
          (command.afterCueId !== null &&
            command.afterCueId !== undefined &&
            sourceOrder[oldIndex - 1] === command.afterCueId));
      if (samePlacement) {
        return noChange(state);
      }

      const next = copyState(state);
      const nextSourceOrder = next.stages[cue.stageId].cueOrder;
      nextSourceOrder.splice(nextSourceOrder.indexOf(cue.id), 1);
      next.cues[cue.id].stageId = targetStage.id;
      insertId(next.stages[targetStage.id].cueOrder, cue.id, command.afterCueId);
      return changed(next);
    }

    case "cue.skip": {
      const cue = state.cues[command.cueId];
      invariant(cue, "cue-not-found", `Cue ${command.cueId} does not exist.`, 404);
      if (cue.status === "skipped") {
        return noChange(state);
      }
      const next = copyState(state);
      next.cues[cue.id].status = "skipped";
      if (next.runtime.activeCueId === cue.id) {
        const nextCueId = findNextCueId(next, cue.id);
        if (nextCueId) {
          activateCue(next, nextCueId, context.now);
        } else {
          next.runtime.activeCueId = null;
          next.runtime.screenOverride = null;
          appendHistory(next, cue.stageId, null, context.now);
        }
      }
      return changed(next);
    }

    case "mission.publish": {
      const mission = state.missions[command.missionId];
      invariant(mission, "mission-not-found", `Mission ${command.missionId} does not exist.`, 404);
      invariant(mission.status !== "closed", "mission-closed", "A closed mission cannot be published.");
      const cue = state.cues[mission.cueId];
      invariant(cue, "cue-not-found", `Mission cue ${mission.cueId} does not exist.`, 404);
      if (mission.status === "open" && state.runtime.activeCueId === cue.id) {
        return noChange(state, { missionId: mission.id });
      }
      const next = copyState(state);
      next.missions[mission.id].status = "open";
      activateCue(next, cue.id, context.now);
      return changed(next, { missionId: mission.id });
    }

    case "mission.complete": {
      invariant(!state.runtime.paused, "event-paused", "The event is paused.", 409);
      const mission = state.missions[command.missionId];
      invariant(mission, "mission-not-found", `Mission ${command.missionId} does not exist.`, 404);
      invariant(mission.status === "open", "mission-locked", "This mission is not open.", 409);
      const guest = state.guests[command.guestId];
      invariant(guest, "guest-not-found", `Guest ${command.guestId} does not exist.`, 404);
      invariant(
        missionAllowsGuest(mission.audience, guest),
        "mission-not-assigned",
        "This mission is not assigned to the guest.",
        403,
      );
      const progressId = `${mission.id}:${guest.id}`;
      if (state.missionProgress[progressId]) {
        return noChange(state, { missionId: mission.id, completed: true });
      }
      const next = copyState(state);
      next.missionProgress[progressId] = {
        id: progressId,
        missionId: mission.id,
        guestId: guest.id,
        status: "completed",
        completedAt: context.now,
      };
      if (mission.points > 0) {
        addScoreEvent(next, {
          sourceKey: `mission:${mission.id}:guest:${guest.id}`,
          target: { kind: "guest", id: guest.id },
          delta: mission.points,
          reason: mission.title,
          now: context.now,
        });
      }
      return changed(next, { missionId: mission.id, completed: true });
    }

    case "interaction.publish": {
      const interaction = state.interactions[command.interactionId];
      invariant(
        interaction,
        "interaction-not-found",
        `Interaction ${command.interactionId} does not exist.`,
        404,
      );
      invariant(
        interaction.phase === "draft" || interaction.phase === "open",
        "interaction-finished",
        "A closed or revealed interaction cannot be published again.",
        409,
      );
      const cue = cueForInteraction(state, interaction.id);
      invariant(cue, "cue-not-found", "No cue references this interaction.", 404);
      if (interaction.phase === "open" && state.runtime.activeCueId === cue.id) {
        return noChange(state, { interactionId: interaction.id });
      }
      const next = copyState(state);
      next.interactions[interaction.id].phase = "open";
      activateCue(next, cue.id, context.now);
      return changed(next, { interactionId: interaction.id, cueId: cue.id });
    }

    case "interaction.publish-quick": {
      invariant(
        !state.interactions[command.interaction.id],
        "interaction-exists",
        `Interaction ${command.interaction.id} already exists.`,
        409,
      );
      invariant(!state.cues[command.cueId], "cue-exists", `Cue ${command.cueId} already exists.`, 409);
      const stageId = command.stageId ?? state.runtime.activeStageId;
      invariant(stageId, "stage-not-selected", "Choose a stage before publishing a quick interaction.");
      invariant(state.stages[stageId], "stage-not-found", `Stage ${stageId} does not exist.`, 404);
      const interaction: Interaction = {
        ...command.interaction,
        prompt: cleanText(command.interaction.prompt, "interaction.prompt", 240),
        phase: "open",
        resultsVisibility: command.interaction.resultsVisibility ?? "after-reveal",
        createdAt: context.now,
      };
      validateInteraction(interaction);
      const cueTitle = command.cueTitle?.trim() || interaction.prompt;
      invariant(cueTitle.length <= 100, "invalid-cue", "cueTitle must be 100 characters or fewer.");

      const next = copyState(state);
      next.interactions[interaction.id] = interaction;
      next.cues[command.cueId] = {
        id: command.cueId,
        stageId,
        title: cueTitle,
        audience: ["guest", "screen"],
        status: "queued",
        payload: { kind: "interaction", interactionId: interaction.id },
        createdAt: context.now,
      };
      insertId(next.stages[stageId].cueOrder, command.cueId, command.afterCueId);
      activateCue(next, command.cueId, context.now);
      return changed(next, { interactionId: interaction.id, cueId: command.cueId });
    }

    case "interaction.respond": {
      invariant(!state.runtime.paused, "event-paused", "The event is paused.", 409);
      const interaction = state.interactions[command.interactionId];
      invariant(
        interaction,
        "interaction-not-found",
        `Interaction ${command.interactionId} does not exist.`,
        404,
      );
      invariant(interaction.phase === "open", "voting-closed", "Voting is not open.", 409);
      invariant(
        activeCueMatchesInteraction(state, interaction.id),
        "interaction-not-active",
        "This interaction is not active.",
        409,
      );
      invariant(state.guests[command.guestId], "guest-not-found", `Guest ${command.guestId} does not exist.`, 404);
      invariant(
        interaction.options.some((option) => option.id === command.optionId),
        "option-not-found",
        `Option ${command.optionId} does not exist.`,
        404,
      );
      const key = responseKey(interaction.id, command.guestId);
      const existing = state.responses[key];
      if (existing?.optionId === command.optionId) {
        return noChange(state, { responseId: key });
      }
      const next = copyState(state);
      next.responses[key] = {
        id: key,
        interactionId: interaction.id,
        guestId: command.guestId,
        optionId: command.optionId,
        submittedAt: context.now,
      };
      return changed(next, { responseId: key });
    }

    case "interaction.close": {
      const interaction = state.interactions[command.interactionId];
      invariant(
        interaction,
        "interaction-not-found",
        `Interaction ${command.interactionId} does not exist.`,
        404,
      );
      if (interaction.phase === "closed" || interaction.phase === "revealed") {
        return noChange(state, { interactionId: interaction.id });
      }
      invariant(interaction.phase === "open", "interaction-not-open", "The interaction is not open.", 409);
      const next = copyState(state);
      next.interactions[interaction.id].phase = "closed";
      return changed(next, { interactionId: interaction.id });
    }

    case "interaction.reveal": {
      const interaction = state.interactions[command.interactionId];
      invariant(
        interaction,
        "interaction-not-found",
        `Interaction ${command.interactionId} does not exist.`,
        404,
      );
      if (interaction.phase === "revealed") {
        return noChange(state, { interactionId: interaction.id, awarded: 0 });
      }
      invariant(
        interaction.phase === "closed",
        "interaction-not-closed",
        "Close voting before revealing the interaction.",
        409,
      );
      const next = copyState(state);
      next.interactions[interaction.id].phase = "revealed";
      let awarded = 0;
      if (interaction.scoring && interaction.correctOptionId) {
        const correctResponses = Object.values(state.responses).filter(
          (response) =>
            response.interactionId === interaction.id &&
            response.optionId === interaction.correctOptionId,
        );
        for (const response of correctResponses) {
          const guest = state.guests[response.guestId];
          if (!guest) continue;
          const target: ScoreTarget =
            interaction.scoring.target === "guest"
              ? { kind: "guest", id: guest.id }
              : { kind: "table", id: guest.tableId };
          if (
            addScoreEvent(next, {
              sourceKey: `interaction:${interaction.id}:guest:${guest.id}:correct`,
              target,
              delta: interaction.scoring.correct,
              reason: interaction.prompt,
              now: context.now,
            })
          ) {
            awarded += 1;
          }
        }
      }
      return changed(next, { interactionId: interaction.id, awarded });
    }

    case "score.adjust": {
      invariant(
        Number.isFinite(command.delta) && Number.isInteger(command.delta),
        "invalid-score",
        "Score adjustments must be whole numbers.",
      );
      if (command.delta === 0) {
        return noChange(state);
      }
      validateScoreTarget(state, command.target);
      const reason = cleanText(command.reason, "reason", 120);
      const next = copyState(state);
      addScoreEvent(next, {
        sourceKey: `manual:${context.commandId}`,
        target: command.target,
        delta: command.delta,
        reason,
        now: context.now,
      });
      return changed(next);
    }

    case "screen.override": {
      if (JSON.stringify(state.runtime.screenOverride) === JSON.stringify(command.override)) {
        return noChange(state);
      }
      if (command.override?.kind === "custom") {
        cleanText(command.override.headline, "override.headline", 120);
      }
      const next = copyState(state);
      next.runtime.screenOverride = command.override;
      return changed(next);
    }

    case "fact.capture": {
      const id = cleanText(command.fact.id, "fact.id", 100);
      const text = cleanText(command.fact.text, "fact.text", 240);
      const source = command.fact.source ?? { kind: "manual" as const };
      if (source.kind === "interaction") {
        invariant(
          state.interactions[source.interactionId],
          "interaction-not-found",
          `Interaction ${source.interactionId} does not exist.`,
          404,
        );
      }
      const existing = state.facts[id];
      if (existing?.text === text && JSON.stringify(existing.source) === JSON.stringify(source)) {
        return noChange(state, { factId: id });
      }
      invariant(!existing, "fact-exists", `Fact ${id} already exists.`, 409);
      const next = copyState(state);
      next.facts[id] = { id, text, source, createdAt: context.now };
      return changed(next, { factId: id });
    }

    default: {
      const exhaustive: never = command;
      throw new DomainError("unknown-command", `Unknown command: ${JSON.stringify(exhaustive)}`);
    }
  }
}
