import type {
  CueAudience,
  CuePayload,
  GuestSide,
  InteractionMode,
  InteractionOption,
  InteractionScoring,
  ModuleConfig,
  ModuleDefinitionId,
  RelationshipCategory,
  ScoreTarget,
  ScreenOverride,
  Surface,
} from "./types";

export interface JoinGuestInput {
  id: string;
  displayName: string;
  side: GuestSide;
  relationshipCategory: RelationshipCategory;
  yearsKnown: number;
  tableId: string;
  relationshipDescription?: string;
  consentToDisplay: boolean;
  avatarStyle?: "round" | "tall" | "star";
}

export interface CueInput {
  id: string;
  title: string;
  audience: CueAudience[];
  payload: CuePayload;
}

export interface QuickInteractionInput {
  id: string;
  mode: InteractionMode;
  prompt: string;
  options: InteractionOption[];
  correctOptionId?: string;
  scoring?: InteractionScoring;
  resultsVisibility?: "live" | "after-reveal";
}

export type EditableContentInput =
  | {
      kind: "announcement";
      cueTitle: string;
      eyebrow?: string;
      headline: string;
      body?: string;
    }
  | {
      kind: "mission";
      cueTitle: string;
      title: string;
      description: string;
      points: number;
    }
  | {
      kind: "interaction";
      cueTitle: string;
      mode: InteractionMode;
      prompt: string;
      options: InteractionOption[];
      correctOptionId?: string;
      points?: number;
      scoreTarget?: "guest" | "table";
    };

export type EventCommand =
  | { type: "event.reset-demo" }
  | { type: "guest.join"; guest: JoinGuestInput }
  | { type: "runtime.set-stage"; stageId: string; cueId?: string }
  | { type: "runtime.activate-cue"; cueId: string }
  | { type: "runtime.advance"; direction: "next" | "previous" }
  | { type: "runtime.set-paused"; paused: boolean }
  | {
      type: "cue.insert";
      stageId: string;
      afterCueId?: string | null;
      cue: CueInput;
    }
  | {
      type: "cue.move";
      cueId: string;
      stageId: string;
      afterCueId?: string | null;
    }
  | { type: "cue.skip"; cueId: string }
  | {
      type: "content.create";
      stageId: string;
      afterCueId?: string | null;
      cueId: string;
      contentId?: string;
      content: EditableContentInput;
    }
  | { type: "content.update"; cueId: string; content: EditableContentInput }
  | { type: "content.delete"; cueId: string }
  | { type: "mission.publish"; missionId: string }
  | { type: "mission.complete"; missionId: string; guestId: string }
  | { type: "interaction.publish"; interactionId: string }
  | {
      type: "interaction.publish-quick";
      stageId?: string;
      afterCueId?: string | null;
      cueId: string;
      cueTitle?: string;
      interaction: QuickInteractionInput;
    }
  | {
      type: "interaction.respond";
      interactionId: string;
      guestId: string;
      optionId: string;
    }
  | { type: "interaction.close"; interactionId: string }
  | { type: "interaction.reopen"; interactionId: string }
  | { type: "interaction.reset"; interactionId: string }
  | { type: "interaction.reveal"; interactionId: string }
  | {
      type: "module.create";
      moduleId: string;
      definitionId: ModuleDefinitionId;
      stageId: string;
      cueId?: string;
      title?: string;
      config?: ModuleConfig;
    }
  | { type: "module.update"; moduleId: string; title: string; config: ModuleConfig }
  | { type: "module.delete"; moduleId: string }
  | { type: "module.set-enabled"; moduleId: string; enabled: boolean }
  | { type: "module.move"; moduleId: string; direction: "previous" | "next" }
  | { type: "module.timer.start"; moduleId: string }
  | { type: "module.timer.pause"; moduleId: string }
  | { type: "module.timer.reset"; moduleId: string }
  | { type: "module.timer.add-time"; moduleId: string; seconds: number }
  | {
      type: "score.adjust";
      target: ScoreTarget;
      delta: number;
      reason: string;
    }
  | { type: "screen.override"; override: ScreenOverride | null }
  | {
      type: "fact.capture";
      fact: {
        id: string;
        text: string;
        source?: { kind: "manual" } | { kind: "interaction"; interactionId: string };
      };
    };

export interface CommandEnvelope {
  commandId: string;
  expectedVersion?: number;
  command: EventCommand;
}

export interface CommandViewRequest {
  surface: Surface;
  guestId?: string;
}

export interface CommandRequest extends CommandEnvelope {
  view?: CommandViewRequest;
}

export interface CommandReceipt {
  commandId: string;
  eventId: string;
  status: "applied" | "noop";
  version: number;
  result?: Record<string, unknown>;
}

export function isGuestCommand(command: EventCommand): boolean {
  return (
    command.type === "guest.join" ||
    command.type === "interaction.respond" ||
    command.type === "mission.complete"
  );
}

export function commandGuestId(command: EventCommand): string | undefined {
  switch (command.type) {
    case "guest.join":
      return command.guest.id;
    case "interaction.respond":
    case "mission.complete":
      return command.guestId;
    default:
      return undefined;
  }
}
