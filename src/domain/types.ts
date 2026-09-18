export type EventStatus = "draft" | "live" | "after-party" | "ended";

export type GuestSide = "groom" | "bride" | "family" | "other";

export type RelationshipCategory =
  | "family"
  | "friend"
  | "work"
  | "school"
  | "club"
  | "military"
  | "other";

export type Surface = "guest" | "admin" | "screen";

export type CueAudience = Exclude<Surface, "admin">;

export interface PartyEvent {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  displayName: string;
  side: GuestSide;
  relationshipCategory: RelationshipCategory;
  yearsKnown: number;
  yearsKnownText?: string;
  tableId: string;
  relationshipDescription?: string;
  companionGroup?: string;
  consentToDisplay: boolean;
  avatarStyle?: "round" | "tall" | "star";
  joinedAt: string;
}

export interface PartyTable {
  id: string;
  name: string;
  color: string;
}

export interface Stage {
  id: string;
  title: string;
  shortLabel: string;
  description?: string;
  cueOrder: string[];
}

export type CueStatus = "queued" | "completed" | "skipped";

export type CuePayload =
  | {
      kind: "announcement";
      eyebrow?: string;
      headline: string;
      body?: string;
    }
  | { kind: "mission"; missionId: string }
  | { kind: "interaction"; interactionId: string }
  | { kind: "leaderboard"; headline: string }
  | {
      kind: "custom";
      eyebrow?: string;
      headline: string;
      body?: string;
    };

export interface Cue {
  id: string;
  stageId: string;
  title: string;
  audience: CueAudience[];
  status: CueStatus;
  payload: CuePayload;
  createdAt: string;
}

export type InteractionMode = "poll" | "quiz" | "prediction" | "challenge";

export type InteractionPhase = "draft" | "open" | "closed" | "revealed";

export interface InteractionOption {
  id: string;
  label: string;
}

export interface InteractionScoring {
  correct: number;
  target: "guest" | "table";
}

export interface Interaction {
  id: string;
  mode: InteractionMode;
  prompt: string;
  options: InteractionOption[];
  correctOptionId?: string;
  phase: InteractionPhase;
  scoring?: InteractionScoring;
  resultsVisibility: "live" | "after-reveal";
  createdAt: string;
}

export interface InteractionResponse {
  id: string;
  interactionId: string;
  guestId: string;
  optionId: string;
  submittedAt: string;
}

export type MissionUnlockPhase = "open" | "program" | "team" | "social" | "secret";

export type MissionStatus = "locked" | "open" | "closed";

export type MissionVerification = "self" | "reciprocal" | "automatic";

export type MissionAudience =
  | { kind: "all" }
  | { kind: "guests"; guestIds: string[] }
  | { kind: "tables"; tableIds: string[] };

export interface Mission {
  id: string;
  cueId: string;
  title: string;
  description: string;
  unlockPhase: MissionUnlockPhase;
  status: MissionStatus;
  verification: MissionVerification;
  audience: MissionAudience;
  points: number;
}

export interface MissionProgress {
  id: string;
  missionId: string;
  guestId: string;
  status: "completed";
  completedAt: string;
}

export type ScoreTarget =
  | { kind: "guest"; id: string }
  | { kind: "table"; id: string };

export interface ScoreEvent {
  id: string;
  sourceKey: string;
  target: ScoreTarget;
  delta: number;
  reason: string;
  createdAt: string;
}

export interface Connection {
  id: string;
  guestIds: [string, string];
  type: "met-at-party";
  sourceMissionId?: string;
  createdAt: string;
}

export interface EventFact {
  id: string;
  text: string;
  source:
    | { kind: "manual" }
    | { kind: "interaction"; interactionId: string };
  createdAt: string;
}

export type ScreenOverride =
  | { kind: "blank" }
  | { kind: "welcome" }
  | { kind: "leaderboard"; headline?: string }
  | { kind: "custom"; eyebrow?: string; headline: string; body?: string };

export interface ActivationRecord {
  stageId: string;
  cueId: string | null;
  activatedAt: string;
}

export type ModuleDefinitionId =
  | "timer"
  | "team-score"
  | "tournament"
  | "league"
  | "prompt-quiz"
  | "ai-rps";

export type ModuleSlot = "primary" | "overlay";
export type ModulePhase = "ready" | "live" | "paused" | "closed";

export type ModuleConfig =
  | {
      kind: "timer";
      durationSeconds: number;
      endBehavior: "notify-only" | "close-interaction";
    }
  | { kind: "team-score"; showRanks: boolean; maxTeams: number }
  | { kind: "tournament"; teamIds: string[]; bestOf: number }
  | { kind: "league"; teamIds: string[]; winPoints: number; drawPoints: number }
  | { kind: "prompt-quiz"; category: "initial-consonant" | "charades"; roundSeconds: number }
  | { kind: "ai-rps"; roundsToWin: number; choiceSeconds: number };

export interface ModuleTimerState {
  status: "idle" | "running" | "paused" | "expired";
  durationMs: number;
  remainingMs: number;
  startedAt?: string;
  endsAt?: string;
}

export interface EventModule {
  id: string;
  definitionId: ModuleDefinitionId;
  definitionVersion: 1;
  stageId: string;
  cueId?: string;
  title: string;
  slot: ModuleSlot;
  order: number;
  enabled: boolean;
  phase: ModulePhase;
  config: ModuleConfig;
  timer?: ModuleTimerState;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleDefinitionSummary {
  id: ModuleDefinitionId;
  title: string;
  description: string;
  slot: ModuleSlot;
}

export interface EventRuntime {
  activeStageId: string | null;
  activeCueId: string | null;
  paused: boolean;
  screenOverride: ScreenOverride | null;
  history: ActivationRecord[];
}

export interface EventState {
  schemaVersion: 1;
  version: number;
  event: PartyEvent;
  runtime: EventRuntime;
  stageOrder: string[];
  stages: Record<string, Stage>;
  cues: Record<string, Cue>;
  guests: Record<string, Guest>;
  tables: Record<string, PartyTable>;
  missions: Record<string, Mission>;
  missionProgress: Record<string, MissionProgress>;
  interactions: Record<string, Interaction>;
  responses: Record<string, InteractionResponse>;
  scoreEvents: Record<string, ScoreEvent>;
  connections: Record<string, Connection>;
  facts: Record<string, EventFact>;
  modules?: Record<string, EventModule>;
}

export interface InteractionOptionResult {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
}

export interface PresentedInteraction {
  id: string;
  mode: InteractionMode;
  prompt: string;
  options: InteractionOption[];
  phase: InteractionPhase;
  totalResponses: number;
  results?: InteractionOptionResult[];
  correctOptionId?: string;
  answeredOptionId?: string;
}

export interface PresentedMission {
  id: string;
  title: string;
  description: string;
  unlockPhase: MissionUnlockPhase;
  verification: MissionVerification;
  points: number;
  completed: boolean;
}

export type PresentedCuePayload =
  | Extract<CuePayload, { kind: "announcement" | "leaderboard" | "custom" }>
  | { kind: "mission"; mission: PresentedMission }
  | { kind: "interaction"; interaction: PresentedInteraction };

export interface PresentedCue {
  id: string;
  stageId: string;
  title: string;
  payload: PresentedCuePayload;
}

export interface StageSummary {
  id: string;
  title: string;
  shortLabel: string;
  description?: string;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  status: EventStatus;
}

export interface TableStanding {
  id: string;
  name: string;
  color: string;
  score: number;
  rank: number;
}

export interface GuestMissionView extends PresentedMission {
  status: MissionStatus;
}

export interface GuestView {
  surface: "guest";
  version: number;
  event: EventSummary;
  paused: boolean;
  participantCount: number;
  tables: PartyTable[];
  guest: Guest | null;
  activeStage: StageSummary | null;
  activeCue: PresentedCue | null;
  availableMissions: GuestMissionView[];
  activeModules: EventModule[];
  leaderboard: TableStanding[];
  score: {
    guest: number;
    table: number | null;
  };
}

export interface AdminInteractionView extends Interaction {
  totalResponses: number;
  results: InteractionOptionResult[];
}

export interface AdminStageView extends Stage {
  cues: Cue[];
}

export interface AdminView {
  surface: "admin";
  version: number;
  event: EventSummary;
  runtime: EventRuntime;
  participantCount: number;
  activeStage: StageSummary | null;
  activeCue: PresentedCue | null;
  stages: AdminStageView[];
  guests: Guest[];
  tables: TableStanding[];
  missions: Mission[];
  missionProgress: MissionProgress[];
  interactions: AdminInteractionView[];
  scoreEvents: ScoreEvent[];
  facts: EventFact[];
  connections: Connection[];
  modules: EventModule[];
  moduleCatalog: ModuleDefinitionSummary[];
}

export interface ScreenView {
  surface: "screen";
  version: number;
  event: EventSummary;
  paused: boolean;
  participantCount: number;
  activeStage: StageSummary | null;
  activeCue: PresentedCue | null;
  screenOverride: ScreenOverride | null;
  leaderboard: TableStanding[];
  activeModules: EventModule[];
}

export type EventView = GuestView | AdminView | ScreenView;
