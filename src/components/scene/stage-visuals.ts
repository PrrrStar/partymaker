export type SceneCueKind =
  | "announcement"
  | "mission"
  | "interaction"
  | "leaderboard"
  | "custom"
  | "standby";

export type SceneInteractionPhase = "draft" | "open" | "closed" | "revealed";

export interface StageVisual {
  camera: readonly [number, number, number];
  target: readonly [number, number, number];
  accent: string;
  secondary: string;
  fog: string;
  energy: number;
  growth: number;
}

type StagePreset = Omit<StageVisual, "energy" | "growth">;

export const STAGE_SCENE_IDS = [
  "stage-check-in",
  "stage-warm-up",
  "stage-telepathy",
  "stage-beat-groom",
  "stage-table-battle",
  "stage-relationship",
  "stage-secret-mission",
  "stage-finale",
  "stage-after-party",
] as const;

const fallback: StagePreset = {
  camera: [0, 1.2, 8.4],
  target: [0, 1.4, 0],
  accent: "#f54b1e",
  secondary: "#ffffff",
  fog: "#050505",
};

const presets: Record<(typeof STAGE_SCENE_IDS)[number], StagePreset> = {
  "stage-check-in": fallback,
  "stage-warm-up": {
    camera: [-2.8, 1.6, 7.2],
    target: [0, 1.5, 0],
    accent: "#f54b1e",
    secondary: "#ffffff",
    fog: "#090604",
  },
  "stage-telepathy": {
    camera: [2.7, 2.2, 6.6],
    target: [0, 1.7, 0],
    accent: "#f54b1e",
    secondary: "#ffffff",
    fog: "#050505",
  },
  "stage-beat-groom": {
    camera: [-3.4, 0.7, 5.7],
    target: [0, 1.2, 0],
    accent: "#f54b1e",
    secondary: "#ffffff",
    fog: "#080503",
  },
  "stage-table-battle": {
    camera: [3.7, 1.1, 5.4],
    target: [0, 1.1, 0],
    accent: "#f54b1e",
    secondary: "#ffffff",
    fog: "#070403",
  },
  "stage-relationship": {
    camera: [-2.2, 3.3, 6.1],
    target: [0, 1.8, 0],
    accent: "#f54b1e",
    secondary: "#ffffff",
    fog: "#050505",
  },
  "stage-secret-mission": {
    camera: [1.8, 0.2, 5.2],
    target: [0, 1.3, 0],
    accent: "#f54b1e",
    secondary: "#ffffff",
    fog: "#090403",
  },
  "stage-finale": {
    camera: [0, 4.1, 7.6],
    target: [0, 1.9, 0],
    accent: "#f54b1e",
    secondary: "#ffffff",
    fog: "#050505",
  },
  "stage-after-party": {
    camera: [4.2, 2.4, 6.8],
    target: [0, 1.4, 0],
    accent: "#f54b1e",
    secondary: "#ffffff",
    fog: "#070403",
  },
};

const cueEnergy: Record<SceneCueKind, number> = {
  announcement: 0.52,
  mission: 0.78,
  interaction: 0.7,
  leaderboard: 0.88,
  custom: 0.62,
  standby: 0.35,
};

export function resolveStageVisual(
  stageId: string | null | undefined,
  cueKind: SceneCueKind = "standby",
  phase?: SceneInteractionPhase,
  participantCount = 0,
): StageVisual {
  const preset =
    stageId && STAGE_SCENE_IDS.includes(stageId as (typeof STAGE_SCENE_IDS)[number])
      ? presets[stageId as (typeof STAGE_SCENE_IDS)[number]]
      : fallback;
  const revealBoost = phase === "revealed" ? 0.22 : phase === "open" ? 0.08 : 0;

  return {
    ...preset,
    energy: Math.min(1, cueEnergy[cueKind] + revealBoost),
    growth: Math.min(1, Math.max(0.28, 0.28 + participantCount / 90)),
  };
}
