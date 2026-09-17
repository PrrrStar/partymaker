import { invariant } from "./errors";
import type {
  AdminInteractionView,
  AdminView,
  Cue,
  EventState,
  EventSummary,
  EventView,
  Guest,
  GuestMissionView,
  GuestView,
  Interaction,
  InteractionOptionResult,
  Mission,
  PresentedCue,
  PresentedInteraction,
  PresentedMission,
  ScreenView,
  StageSummary,
  Surface,
  TableStanding,
} from "./types";

function eventSummary(state: EventState): EventSummary {
  const { id, slug, title, subtitle, status } = state.event;
  return { id, slug, title, subtitle, status };
}

function stageSummary(state: EventState, stageId: string | null): StageSummary | null {
  if (!stageId) return null;
  const stage = state.stages[stageId];
  if (!stage) return null;
  const { id, title, shortLabel, description } = stage;
  return { id, title, shortLabel, description };
}

export function selectInteractionResults(
  state: EventState,
  interaction: Interaction,
): InteractionOptionResult[] {
  const responses = Object.values(state.responses).filter(
    (response) => response.interactionId === interaction.id,
  );
  const total = responses.length;

  return interaction.options.map((option) => {
    const count = responses.filter((response) => response.optionId === option.id).length;
    return {
      optionId: option.id,
      label: option.label,
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 1_000) / 10,
    };
  });
}

function responseCount(state: EventState, interactionId: string): number {
  return Object.values(state.responses).filter(
    (response) => response.interactionId === interactionId,
  ).length;
}

function presentInteraction(
  state: EventState,
  interaction: Interaction,
  surface: Surface,
  guestId?: string,
): PresentedInteraction {
  const canSeeResults =
    surface === "admin" ||
    interaction.resultsVisibility === "live" ||
    (surface === "screen" && interaction.phase === "revealed") ||
    (surface === "guest" && interaction.phase === "revealed");
  const canSeeCorrectAnswer =
    surface === "admin" || interaction.phase === "revealed";
  const answeredOptionId = guestId
    ? state.responses[`${interaction.id}:${guestId}`]?.optionId
    : undefined;

  return {
    id: interaction.id,
    mode: interaction.mode,
    prompt: interaction.prompt,
    options: interaction.options,
    phase: interaction.phase,
    totalResponses: responseCount(state, interaction.id),
    results: canSeeResults
      ? selectInteractionResults(state, interaction)
      : undefined,
    correctOptionId: canSeeCorrectAnswer
      ? interaction.correctOptionId
      : undefined,
    answeredOptionId,
  };
}

function missionAllowsGuest(mission: Mission, guest: Guest | null): boolean {
  if (mission.audience.kind === "all") return true;
  if (!guest) return false;
  if (mission.audience.kind === "guests") {
    return mission.audience.guestIds.includes(guest.id);
  }
  return mission.audience.tableIds.includes(guest.tableId);
}

function presentMission(
  state: EventState,
  mission: Mission,
  guestId?: string,
): PresentedMission {
  return {
    id: mission.id,
    title: mission.title,
    description: mission.description,
    unlockPhase: mission.unlockPhase,
    verification: mission.verification,
    points: mission.points,
    completed: Boolean(
      guestId && state.missionProgress[`${mission.id}:${guestId}`],
    ),
  };
}

function presentCue(
  state: EventState,
  cue: Cue,
  surface: Surface,
  guestId?: string,
): PresentedCue | null {
  if (surface !== "admin" && !cue.audience.includes(surface)) {
    return null;
  }

  if (cue.payload.kind === "mission") {
    const mission = state.missions[cue.payload.missionId];
    if (!mission) return null;
    const guest = guestId ? state.guests[guestId] ?? null : null;
    if (
      surface !== "admin" &&
      (mission.status !== "open" ||
        (surface === "guest" && !missionAllowsGuest(mission, guest)))
    ) {
      return null;
    }
    return {
      id: cue.id,
      stageId: cue.stageId,
      title: cue.title,
      payload: {
        kind: "mission",
        mission: presentMission(state, mission, guestId),
      },
    };
  }

  if (cue.payload.kind === "interaction") {
    const interaction = state.interactions[cue.payload.interactionId];
    if (!interaction) return null;
    return {
      id: cue.id,
      stageId: cue.stageId,
      title: cue.title,
      payload: {
        kind: "interaction",
        interaction: presentInteraction(state, interaction, surface, guestId),
      },
    };
  }

  return {
    id: cue.id,
    stageId: cue.stageId,
    title: cue.title,
    payload: cue.payload,
  };
}

function activeCue(
  state: EventState,
  surface: Surface,
  guestId?: string,
): PresentedCue | null {
  const cue = state.runtime.activeCueId
    ? state.cues[state.runtime.activeCueId]
    : undefined;
  return cue ? presentCue(state, cue, surface, guestId) : null;
}

function scoreFor(
  state: EventState,
  kind: "guest" | "table",
  id: string,
): number {
  return Object.values(state.scoreEvents)
    .filter((event) => event.target.kind === kind && event.target.id === id)
    .reduce((sum, event) => sum + event.delta, 0);
}

export function selectTableStandings(state: EventState): TableStanding[] {
  const sorted = Object.values(state.tables)
    .map((table) => ({
      ...table,
      score: scoreFor(state, "table", table.id),
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));

  return sorted.map((table, index) => ({ ...table, rank: index + 1 }));
}

export function selectGuestView(
  state: EventState,
  guestId?: string,
): GuestView {
  const guest = guestId ? state.guests[guestId] ?? null : null;
  const availableMissions: GuestMissionView[] = Object.values(state.missions)
    .filter(
      (mission) =>
        mission.status === "open" && missionAllowsGuest(mission, guest),
    )
    .map((mission) => ({
      ...presentMission(state, mission, guestId),
      status: mission.status,
    }));

  return {
    surface: "guest",
    version: state.version,
    event: eventSummary(state),
    paused: state.runtime.paused,
    participantCount: Object.keys(state.guests).length,
    tables: Object.values(state.tables).sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    guest,
    activeStage: stageSummary(state, state.runtime.activeStageId),
    activeCue: activeCue(state, "guest", guestId),
    availableMissions,
    score: {
      guest: guest ? scoreFor(state, "guest", guest.id) : 0,
      table: guest ? scoreFor(state, "table", guest.tableId) : null,
    },
  };
}

export function selectAdminView(state: EventState): AdminView {
  const interactions: AdminInteractionView[] = Object.values(state.interactions).map(
    (interaction) => ({
      ...interaction,
      totalResponses: responseCount(state, interaction.id),
      results: selectInteractionResults(state, interaction),
    }),
  );

  return {
    surface: "admin",
    version: state.version,
    event: eventSummary(state),
    runtime: state.runtime,
    participantCount: Object.keys(state.guests).length,
    activeStage: stageSummary(state, state.runtime.activeStageId),
    activeCue: activeCue(state, "admin"),
    stages: state.stageOrder.map((stageId) => ({
      ...state.stages[stageId],
      cues: state.stages[stageId].cueOrder
        .map((cueId) => state.cues[cueId])
        .filter((cue): cue is Cue => Boolean(cue)),
    })),
    guests: Object.values(state.guests).sort((left, right) =>
      left.joinedAt.localeCompare(right.joinedAt),
    ),
    tables: selectTableStandings(state),
    missions: Object.values(state.missions),
    missionProgress: Object.values(state.missionProgress),
    interactions,
    scoreEvents: Object.values(state.scoreEvents),
    facts: Object.values(state.facts),
    connections: Object.values(state.connections),
  };
}

export function selectScreenView(state: EventState): ScreenView {
  return {
    surface: "screen",
    version: state.version,
    event: eventSummary(state),
    paused: state.runtime.paused,
    participantCount: Object.keys(state.guests).length,
    activeStage: stageSummary(state, state.runtime.activeStageId),
    activeCue: activeCue(state, "screen"),
    screenOverride: state.runtime.screenOverride,
    leaderboard: selectTableStandings(state),
  };
}

export function selectView(
  state: EventState,
  surface: Surface,
  guestId?: string,
): EventView {
  switch (surface) {
    case "guest":
      return selectGuestView(state, guestId);
    case "admin":
      return selectAdminView(state);
    case "screen":
      return selectScreenView(state);
    default:
      invariant(false, "invalid-surface", `Unknown surface: ${String(surface)}`);
  }
}
