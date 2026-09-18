import type { EditableContentInput, EventCommand } from "./commands";
import { DomainError, invariant } from "./errors";
import {
  defaultModuleConfig,
  moduleDefinition,
  moduleSlot,
  validateModuleConfig,
} from "./modules";
import { createDemoEventState } from "./seed";
import type {
  Cue,
  EventModule,
  EventState,
  Guest,
  Interaction,
  Mission,
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

function cleanOptionalText(
  value: string | undefined,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return cleanText(value, field, maxLength);
}

function contentKindForCue(cue: Cue): EditableContentInput["kind"] | null {
  if (cue.payload.kind === "announcement" || cue.payload.kind === "custom") {
    return "announcement";
  }
  if (cue.payload.kind === "mission") return "mission";
  if (cue.payload.kind === "interaction") return "interaction";
  return null;
}

function interactionFromContent(
  content: Extract<EditableContentInput, { kind: "interaction" }>,
  id: string,
  createdAt: string,
  phase: Interaction["phase"] = "draft",
): Interaction {
  const points = content.points ?? 0;
  invariant(
    Number.isInteger(points) && points >= 0 && points <= 100,
    "invalid-interaction",
    "Interaction points must be a whole number between 0 and 100.",
  );
  const interaction: Interaction = {
    id: cleanText(id, "interaction.id", 100),
    mode: content.mode,
    prompt: cleanText(content.prompt, "interaction.prompt", 240),
    options: content.options.map((option) => ({
      id: cleanText(option.id, "option.id", 100),
      label: cleanText(option.label, "option.label", 80),
    })),
    correctOptionId: cleanOptionalText(
      content.correctOptionId,
      "interaction.correctOptionId",
      100,
    ),
    phase,
    scoring:
      points > 0 && content.correctOptionId
        ? { correct: points, target: content.scoreTarget ?? "guest" }
        : undefined,
    resultsVisibility: "after-reveal",
    createdAt,
  };
  validateInteraction(interaction);
  return interaction;
}

function missionFromContent(
  content: Extract<EditableContentInput, { kind: "mission" }>,
  id: string,
  cueId: string,
): Mission {
  invariant(
    Number.isInteger(content.points) && content.points >= 0 && content.points <= 100,
    "invalid-mission",
    "Mission points must be a whole number between 0 and 100.",
  );
  return {
    id: cleanText(id, "mission.id", 100),
    cueId,
    title: cleanText(content.title, "mission.title", 100),
    description: cleanText(content.description, "mission.description", 240),
    unlockPhase: "program",
    status: "locked",
    verification: "self",
    audience: { kind: "all" },
    points: content.points,
  };
}

function clearInteractionArtifacts(state: EventState, interactionId: string): void {
  for (const [key, response] of Object.entries(state.responses)) {
    if (response.interactionId === interactionId) delete state.responses[key];
  }
  for (const key of Object.keys(state.scoreEvents)) {
    if (key.startsWith(`interaction:${interactionId}:`)) delete state.scoreEvents[key];
  }
  for (const [key, fact] of Object.entries(state.facts)) {
    if (fact.source.kind === "interaction" && fact.source.interactionId === interactionId) {
      delete state.facts[key];
    }
  }
}

function clearMissionArtifacts(state: EventState, missionId: string): void {
  for (const [key, progress] of Object.entries(state.missionProgress)) {
    if (progress.missionId === missionId) delete state.missionProgress[key];
  }
  for (const key of Object.keys(state.scoreEvents)) {
    if (key.startsWith(`mission:${missionId}:`)) delete state.scoreEvents[key];
  }
}

function fallbackCueForDeletion(state: EventState, cueId: string): string | null {
  const cueIds = orderedCueIds(state);
  const index = cueIds.indexOf(cueId);
  const candidates = [
    ...cueIds.slice(index + 1),
    ...cueIds.slice(0, Math.max(0, index)).reverse(),
  ];
  return (
    candidates.find(
      (candidateId) =>
        candidateId !== cueId && state.cues[candidateId]?.status !== "skipped",
    ) ?? null
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
    left.consentToDisplay === right.consentToDisplay &&
    left.avatarStyle === right.avatarStyle
  );
}

function modulesInScope(state: EventState, instance: EventModule): EventModule[] {
  return Object.values(state.modules ?? {})
    .filter(
      (candidate) =>
        candidate.stageId === instance.stageId && candidate.cueId === instance.cueId,
    )
    .sort(
      (left, right) =>
        left.order - right.order || left.createdAt.localeCompare(right.createdAt),
    );
}

function timerRemaining(instance: EventModule, now: string): number {
  const timer = instance.timer;
  if (!timer) return 0;
  if (timer.status !== "running" || !timer.endsAt) return timer.remainingMs;
  return Math.max(0, Date.parse(timer.endsAt) - Date.parse(now));
}

function startTimersForCue(state: EventState, cue: Cue, now: string): void {
  for (const instance of Object.values(state.modules ?? {})) {
    if (
      !instance.enabled ||
      instance.definitionId !== "timer" ||
      !instance.timer ||
      instance.stageId !== cue.stageId ||
      instance.cueId !== cue.id
    ) continue;
    const durationMs = instance.timer.durationMs;
    instance.phase = "live";
    instance.timer = {
      ...instance.timer,
      status: "running",
      remainingMs: durationMs,
      startedAt: now,
      endsAt: new Date(Date.parse(now) + durationMs).toISOString(),
    };
    instance.updatedAt = now;
  }
}

function stopTimersForCue(state: EventState, cue: Cue | undefined, now: string): void {
  if (!cue) return;
  for (const instance of Object.values(state.modules ?? {})) {
    if (
      instance.definitionId !== "timer" ||
      !instance.timer ||
      instance.stageId !== cue.stageId ||
      instance.cueId !== cue.id
    ) continue;
    instance.phase = "closed";
    instance.timer = {
      ...instance.timer,
      status: "expired",
      remainingMs: 0,
      endsAt: undefined,
    };
    instance.updatedAt = now;
  }
}

function resetTimersForCue(state: EventState, cue: Cue | undefined, now: string): void {
  if (!cue) return;
  for (const instance of Object.values(state.modules ?? {})) {
    if (
      instance.definitionId !== "timer" ||
      !instance.timer ||
      instance.stageId !== cue.stageId ||
      instance.cueId !== cue.id
    ) continue;
    instance.phase = "ready";
    instance.timer = {
      status: "idle",
      durationMs: instance.timer.durationMs,
      remainingMs: instance.timer.durationMs,
    };
    instance.updatedAt = now;
  }
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
      invariant(
        command.guest.avatarStyle === undefined ||
          ["round", "tall", "star"].includes(command.guest.avatarStyle),
        "invalid-guest",
        "Unknown lobby avatar style.",
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
        avatarStyle: command.guest.avatarStyle ?? existing?.avatarStyle ?? "round",
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

    case "content.create": {
      const stage = state.stages[command.stageId];
      invariant(stage, "stage-not-found", `Stage ${command.stageId} does not exist.`, 404);
      const cueId = cleanText(command.cueId, "cue.id", 100);
      invariant(!state.cues[cueId], "cue-exists", `Cue ${cueId} already exists.`, 409);
      const cueTitle = cleanText(command.content.cueTitle, "cue.title", 100);
      const next = copyState(state);
      let payload: Cue["payload"];

      if (command.content.kind === "announcement") {
        payload = {
          kind: "announcement",
          eyebrow: cleanOptionalText(command.content.eyebrow, "cue.eyebrow", 80),
          headline: cleanText(command.content.headline, "cue.headline", 160),
          body: cleanOptionalText(command.content.body, "cue.body", 300),
        };
      } else {
        invariant(command.contentId, "content-id-required", "A linked content ID is required.");
        const contentId = cleanText(command.contentId, "content.id", 100);
        if (command.content.kind === "mission") {
          invariant(!state.missions[contentId], "mission-exists", `Mission ${contentId} already exists.`, 409);
          next.missions[contentId] = missionFromContent(command.content, contentId, cueId);
          payload = { kind: "mission", missionId: contentId };
        } else {
          invariant(!state.interactions[contentId], "interaction-exists", `Interaction ${contentId} already exists.`, 409);
          next.interactions[contentId] = interactionFromContent(
            command.content,
            contentId,
            context.now,
          );
          payload = { kind: "interaction", interactionId: contentId };
        }
      }

      next.cues[cueId] = {
        id: cueId,
        stageId: stage.id,
        title: cueTitle,
        audience: ["guest", "screen"],
        status: "queued",
        payload,
        createdAt: context.now,
      };
      insertId(next.stages[stage.id].cueOrder, cueId, command.afterCueId);
      return changed(next, { cueId, contentId: command.contentId });
    }

    case "content.update": {
      const cue = state.cues[command.cueId];
      invariant(cue, "cue-not-found", `Cue ${command.cueId} does not exist.`, 404);
      const currentKind = contentKindForCue(cue);
      invariant(currentKind, "content-not-editable", "This cue type is not editable.", 409);
      invariant(
        currentKind === command.content.kind,
        "content-kind-mismatch",
        "Change the content type by deleting and creating a new cue.",
        409,
      );
      const next = copyState(state);
      next.cues[cue.id].title = cleanText(command.content.cueTitle, "cue.title", 100);

      if (command.content.kind === "announcement") {
        next.cues[cue.id].payload = {
          kind: "announcement",
          eyebrow: cleanOptionalText(command.content.eyebrow, "cue.eyebrow", 80),
          headline: cleanText(command.content.headline, "cue.headline", 160),
          body: cleanOptionalText(command.content.body, "cue.body", 300),
        };
      } else if (command.content.kind === "mission") {
        invariant(cue.payload.kind === "mission", "content-kind-mismatch", "Mission payload expected.");
        const mission = state.missions[cue.payload.missionId];
        invariant(mission, "mission-not-found", `Mission ${cue.payload.missionId} does not exist.`, 404);
        const updated = missionFromContent(command.content, mission.id, cue.id);
        next.missions[mission.id] = {
          ...updated,
          status: mission.status,
          unlockPhase: mission.unlockPhase,
          audience: mission.audience,
          verification: mission.verification,
        };
      } else {
        invariant(cue.payload.kind === "interaction", "content-kind-mismatch", "Interaction payload expected.");
        const interaction = state.interactions[cue.payload.interactionId];
        invariant(interaction, "interaction-not-found", `Interaction ${cue.payload.interactionId} does not exist.`, 404);
        invariant(
          interaction.phase === "draft",
          "interaction-not-editable",
          "Reset this interaction before editing it.",
          409,
        );
        next.interactions[interaction.id] = interactionFromContent(
          command.content,
          interaction.id,
          interaction.createdAt,
          interaction.phase,
        );
      }
      return changed(next, { cueId: cue.id });
    }

    case "content.delete": {
      const cue = state.cues[command.cueId];
      invariant(cue, "cue-not-found", `Cue ${command.cueId} does not exist.`, 404);
      const fallbackCueId =
        state.runtime.activeCueId === cue.id ? fallbackCueForDeletion(state, cue.id) : null;
      const next = copyState(state);

      if (cue.payload.kind === "mission") {
        clearMissionArtifacts(next, cue.payload.missionId);
        delete next.missions[cue.payload.missionId];
      } else if (cue.payload.kind === "interaction") {
        clearInteractionArtifacts(next, cue.payload.interactionId);
        delete next.interactions[cue.payload.interactionId];
      }

      const order = next.stages[cue.stageId].cueOrder;
      order.splice(order.indexOf(cue.id), 1);
      delete next.cues[cue.id];
      next.runtime.history = next.runtime.history.filter((entry) => entry.cueId !== cue.id);

      if (state.runtime.activeCueId === cue.id) {
        if (fallbackCueId) {
          activateCue(next, fallbackCueId, context.now);
        } else {
          next.runtime.activeCueId = null;
          next.runtime.screenOverride = null;
          appendHistory(next, cue.stageId, null, context.now);
        }
      }
      return changed(next, { cueId: cue.id, fallbackCueId });
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
      startTimersForCue(next, cue, context.now);
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
      const responseCue = cueForInteraction(state, interaction.id);
      const responseTimer = Object.values(state.modules ?? {}).find(
        (instance) =>
          instance.enabled &&
          instance.definitionId === "timer" &&
          instance.cueId === responseCue?.id &&
          instance.timer?.status === "running",
      );
      invariant(
        !responseTimer?.timer?.endsAt || Date.parse(context.now) < Date.parse(responseTimer.timer.endsAt),
        "timer-expired",
        "The response timer has ended.",
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
      stopTimersForCue(next, cueForInteraction(next, interaction.id), context.now);
      return changed(next, { interactionId: interaction.id });
    }

    case "interaction.reopen": {
      const interaction = state.interactions[command.interactionId];
      invariant(
        interaction,
        "interaction-not-found",
        `Interaction ${command.interactionId} does not exist.`,
        404,
      );
      if (interaction.phase === "open") {
        return noChange(state, { interactionId: interaction.id });
      }
      invariant(
        interaction.phase === "closed",
        "interaction-not-reopenable",
        "Only a closed, unrevealed interaction can be reopened.",
        409,
      );
      const next = copyState(state);
      next.interactions[interaction.id].phase = "open";
      const cue = cueForInteraction(next, interaction.id);
      if (cue) {
        activateCue(next, cue.id, context.now);
        startTimersForCue(next, cue, context.now);
      }
      return changed(next, { interactionId: interaction.id });
    }

    case "interaction.reset": {
      const interaction = state.interactions[command.interactionId];
      invariant(
        interaction,
        "interaction-not-found",
        `Interaction ${command.interactionId} does not exist.`,
        404,
      );
      const hasResponses = Object.values(state.responses).some(
        (response) => response.interactionId === interaction.id,
      );
      const hasScores = Object.keys(state.scoreEvents).some((key) =>
        key.startsWith(`interaction:${interaction.id}:`),
      );
      if (interaction.phase === "draft" && !hasResponses && !hasScores) {
        return noChange(state, { interactionId: interaction.id });
      }

      const next = copyState(state);
      clearInteractionArtifacts(next, interaction.id);
      next.interactions[interaction.id].phase = "draft";
      const cue = cueForInteraction(next, interaction.id);
      resetTimersForCue(next, cue, context.now);
      if (cue && next.runtime.activeCueId === cue.id) {
        const stage = next.stages[cue.stageId];
        const index = stage.cueOrder.indexOf(cue.id);
        const previousCueId = stage.cueOrder
          .slice(0, Math.max(0, index))
          .reverse()
          .find((cueId) => next.cues[cueId]?.status !== "skipped");
        if (previousCueId) {
          activateCue(next, previousCueId, context.now);
        } else {
          next.runtime.activeCueId = null;
          next.runtime.screenOverride = null;
          appendHistory(next, cue.stageId, null, context.now);
        }
      }
      return changed(next, { interactionId: interaction.id, reset: true });
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

    case "module.create": {
      const moduleId = cleanText(command.moduleId, "module.id", 100);
      invariant(!state.modules?.[moduleId], "module-exists", `Module ${moduleId} already exists.`, 409);
      const stage = state.stages[command.stageId];
      invariant(stage, "stage-not-found", `Stage ${command.stageId} does not exist.`, 404);
      if (command.cueId) {
        const cue = state.cues[command.cueId];
        invariant(cue, "cue-not-found", `Cue ${command.cueId} does not exist.`, 404);
        invariant(cue.stageId === stage.id, "invalid-module-scope", "Module cue must belong to its stage.");
      }
      const definition = moduleDefinition(command.definitionId);
      const config = command.config ?? defaultModuleConfig(
        command.definitionId,
        Object.keys(state.tables),
      );
      validateModuleConfig(command.definitionId, config, state);
      const scopedModules = Object.values(state.modules ?? {}).filter(
        (candidate) => candidate.stageId === stage.id && candidate.cueId === command.cueId,
      );
      if (definition.slot === "primary") {
        invariant(
          !scopedModules.some((candidate) => candidate.slot === "primary" && candidate.enabled),
          "primary-module-exists",
          "Disable the current primary module before adding another one.",
          409,
        );
      }
      const order = scopedModules.reduce((maximum, candidate) => Math.max(maximum, candidate.order), -1) + 1;
      const durationMs = config.kind === "timer" ? config.durationSeconds * 1_000 : undefined;
      const instance: EventModule = {
        id: moduleId,
        definitionId: command.definitionId,
        definitionVersion: 1,
        stageId: stage.id,
        cueId: command.cueId,
        title: cleanOptionalText(command.title, "module.title", 100) ?? definition.title,
        slot: moduleSlot(command.definitionId),
        order,
        enabled: true,
        phase: "ready",
        config,
        timer:
          durationMs === undefined
            ? undefined
            : {
                status: "idle",
                durationMs,
                remainingMs: durationMs,
              },
        createdAt: context.now,
        updatedAt: context.now,
      };
      const next = copyState(state);
      next.modules ??= {};
      next.modules[moduleId] = instance;
      return changed(next, { moduleId });
    }

    case "module.update": {
      const instance = state.modules?.[command.moduleId];
      invariant(instance, "module-not-found", `Module ${command.moduleId} does not exist.`, 404);
      validateModuleConfig(instance.definitionId, command.config, state);
      const title = cleanText(command.title, "module.title", 100);
      const next = copyState(state);
      next.modules ??= {};
      const durationMs = command.config.kind === "timer" ? command.config.durationSeconds * 1_000 : undefined;
      next.modules[instance.id] = {
        ...instance,
        title,
        config: command.config,
        timer:
          durationMs === undefined
            ? undefined
            : {
                status: "idle",
                durationMs,
                remainingMs: durationMs,
              },
        phase: "ready",
        updatedAt: context.now,
      };
      return changed(next, { moduleId: instance.id });
    }

    case "module.delete": {
      const instance = state.modules?.[command.moduleId];
      invariant(instance, "module-not-found", `Module ${command.moduleId} does not exist.`, 404);
      const next = copyState(state);
      delete next.modules?.[instance.id];
      return changed(next, { moduleId: instance.id });
    }

    case "module.set-enabled": {
      const instance = state.modules?.[command.moduleId];
      invariant(instance, "module-not-found", `Module ${command.moduleId} does not exist.`, 404);
      invariant(typeof command.enabled === "boolean", "invalid-command", "enabled must be a boolean.");
      if (instance.enabled === command.enabled) return noChange(state);
      if (command.enabled && instance.slot === "primary") {
        invariant(
          !modulesInScope(state, instance).some(
            (candidate) => candidate.id !== instance.id && candidate.slot === "primary" && candidate.enabled,
          ),
          "primary-module-exists",
          "Disable the current primary module before enabling this one.",
          409,
        );
      }
      const next = copyState(state);
      next.modules ??= {};
      next.modules[instance.id] = { ...instance, enabled: command.enabled, updatedAt: context.now };
      return changed(next, { moduleId: instance.id });
    }

    case "module.move": {
      const instance = state.modules?.[command.moduleId];
      invariant(instance, "module-not-found", `Module ${command.moduleId} does not exist.`, 404);
      const scoped = modulesInScope(state, instance);
      const index = scoped.findIndex((candidate) => candidate.id === instance.id);
      const targetIndex = command.direction === "previous" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= scoped.length) return noChange(state, { atBoundary: true });
      const target = scoped[targetIndex];
      const next = copyState(state);
      next.modules ??= {};
      next.modules[instance.id].order = target.order;
      next.modules[target.id].order = instance.order;
      next.modules[instance.id].updatedAt = context.now;
      next.modules[target.id].updatedAt = context.now;
      return changed(next, { moduleId: instance.id });
    }

    case "module.timer.start": {
      const instance = state.modules?.[command.moduleId];
      invariant(instance?.config.kind === "timer" && instance.timer, "timer-not-found", "Timer module does not exist.", 404);
      if (instance.timer.status === "running" && timerRemaining(instance, context.now) > 0) return noChange(state);
      const remainingMs =
        instance.timer.status === "expired" || instance.timer.remainingMs <= 0
          ? instance.timer.durationMs
          : instance.timer.remainingMs;
      const next = copyState(state);
      next.modules ??= {};
      next.modules[instance.id] = {
        ...instance,
        phase: "live",
        timer: {
          ...instance.timer,
          status: "running",
          remainingMs,
          startedAt: context.now,
          endsAt: new Date(Date.parse(context.now) + remainingMs).toISOString(),
        },
        updatedAt: context.now,
      };
      return changed(next, { moduleId: instance.id });
    }

    case "module.timer.pause": {
      const instance = state.modules?.[command.moduleId];
      invariant(instance?.config.kind === "timer" && instance.timer, "timer-not-found", "Timer module does not exist.", 404);
      if (instance.timer.status !== "running") return noChange(state);
      const remainingMs = timerRemaining(instance, context.now);
      const next = copyState(state);
      next.modules ??= {};
      next.modules[instance.id] = {
        ...instance,
        phase: remainingMs > 0 ? "paused" : "closed",
        timer: {
          ...instance.timer,
          status: remainingMs > 0 ? "paused" : "expired",
          remainingMs,
          endsAt: undefined,
        },
        updatedAt: context.now,
      };
      return changed(next, { moduleId: instance.id, remainingMs });
    }

    case "module.timer.reset": {
      const instance = state.modules?.[command.moduleId];
      invariant(instance?.config.kind === "timer" && instance.timer, "timer-not-found", "Timer module does not exist.", 404);
      const next = copyState(state);
      next.modules ??= {};
      next.modules[instance.id] = {
        ...instance,
        phase: "ready",
        timer: {
          status: "idle",
          durationMs: instance.timer.durationMs,
          remainingMs: instance.timer.durationMs,
        },
        updatedAt: context.now,
      };
      return changed(next, { moduleId: instance.id });
    }

    case "module.timer.add-time": {
      const instance = state.modules?.[command.moduleId];
      invariant(instance?.config.kind === "timer" && instance.timer, "timer-not-found", "Timer module does not exist.", 404);
      invariant(Number.isInteger(command.seconds) && command.seconds > 0 && command.seconds <= 600, "invalid-timer-extension", "Timer extension must be 1 to 600 seconds.");
      const addedMs = command.seconds * 1_000;
      const remainingMs = timerRemaining(instance, context.now) + addedMs;
      const next = copyState(state);
      next.modules ??= {};
      next.modules[instance.id] = {
        ...instance,
        timer: {
          ...instance.timer,
          status: instance.timer.status === "expired" ? "paused" : instance.timer.status,
          remainingMs,
          endsAt:
            instance.timer.status === "running"
              ? new Date(Date.parse(context.now) + remainingMs).toISOString()
              : undefined,
        },
        phase: instance.timer.status === "expired" ? "paused" : instance.phase,
        updatedAt: context.now,
      };
      return changed(next, { moduleId: instance.id, remainingMs });
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
