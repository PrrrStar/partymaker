import { invariant } from "./errors";
import type {
  EventModule,
  EventState,
  ModuleConfig,
  ModuleDefinitionId,
  ModuleDefinitionSummary,
  ModuleSlot,
} from "./types";

export const MODULE_CATALOG: ModuleDefinitionSummary[] = [
  {
    id: "timer",
    title: "카운트다운 타이머",
    description: "응답과 게임 시간을 시작·일시 정지·연장합니다.",
    slot: "overlay",
  },
  {
    id: "team-score",
    title: "팀별 점수판",
    description: "현재 테이블 점수와 순위를 함께 표시합니다.",
    slot: "overlay",
  },
  {
    id: "tournament",
    title: "토너먼트",
    description: "테이블 대진과 다음 라운드 진행을 준비합니다.",
    slot: "primary",
  },
  {
    id: "league",
    title: "리그",
    description: "승·무·패 승점으로 테이블 리그를 운영합니다.",
    slot: "primary",
  },
  {
    id: "prompt-quiz",
    title: "초성·제시어 퀴즈",
    description: "초성 퀴즈와 몸으로 말해요 라운드를 구성합니다.",
    slot: "primary",
  },
  {
    id: "ai-rps",
    title: "AI 가위바위보",
    description: "방 선택 패턴에 적응하는 AI와 3판 승부를 준비합니다.",
    slot: "primary",
  },
];

export function moduleDefinition(id: ModuleDefinitionId) {
  const definition = MODULE_CATALOG.find((item) => item.id === id);
  invariant(definition, "module-definition-not-found", `Module ${id} is not registered.`, 404);
  return definition;
}

export function defaultModuleConfig(
  id: ModuleDefinitionId,
  tableIds: string[],
): ModuleConfig {
  switch (id) {
    case "timer":
      return { kind: "timer", durationSeconds: 15, endBehavior: "notify-only" };
    case "team-score":
      return { kind: "team-score", showRanks: true, maxTeams: 8 };
    case "tournament":
      return { kind: "tournament", teamIds: tableIds.slice(0, 8), bestOf: 1 };
    case "league":
      return {
        kind: "league",
        teamIds: tableIds.slice(0, 8),
        winPoints: 3,
        drawPoints: 1,
      };
    case "prompt-quiz":
      return { kind: "prompt-quiz", category: "initial-consonant", roundSeconds: 15 };
    case "ai-rps":
      return { kind: "ai-rps", roundsToWin: 2, choiceSeconds: 7 };
  }
}

function wholeNumber(value: number, field: string, min: number, max: number) {
  invariant(
    Number.isInteger(value) && value >= min && value <= max,
    "invalid-module-config",
    `${field} must be a whole number between ${min} and ${max}.`,
  );
}

export function validateModuleConfig(
  definitionId: ModuleDefinitionId,
  config: ModuleConfig,
  state: EventState,
): void {
  invariant(
    config.kind === definitionId,
    "module-config-mismatch",
    "Module config does not match its definition.",
  );

  switch (config.kind) {
    case "timer":
      wholeNumber(config.durationSeconds, "durationSeconds", 3, 3600);
      return;
    case "team-score":
      wholeNumber(config.maxTeams, "maxTeams", 2, 32);
      return;
    case "tournament":
      wholeNumber(config.bestOf, "bestOf", 1, 9);
      invariant(config.bestOf % 2 === 1, "invalid-module-config", "bestOf must be odd.");
      break;
    case "league":
      wholeNumber(config.winPoints, "winPoints", 1, 10);
      wholeNumber(config.drawPoints, "drawPoints", 0, config.winPoints);
      break;
    case "prompt-quiz":
      wholeNumber(config.roundSeconds, "roundSeconds", 5, 300);
      return;
    case "ai-rps":
      wholeNumber(config.roundsToWin, "roundsToWin", 1, 5);
      wholeNumber(config.choiceSeconds, "choiceSeconds", 3, 30);
      return;
  }

  for (const tableId of config.teamIds) {
    invariant(state.tables[tableId], "table-not-found", `Table ${tableId} does not exist.`, 404);
  }
  invariant(
    new Set(config.teamIds).size === config.teamIds.length && config.teamIds.length >= 2,
    "invalid-module-config",
    "A competition module needs at least two unique teams.",
  );
}

export function moduleSlot(id: ModuleDefinitionId): ModuleSlot {
  return moduleDefinition(id).slot;
}

export function activeModules(state: EventState): EventModule[] {
  const stageId = state.runtime.activeStageId;
  const cueId = state.runtime.activeCueId;
  if (!stageId) return [];
  return Object.values(state.modules ?? {})
    .filter(
      (module) =>
        module.enabled &&
        module.stageId === stageId &&
        (module.cueId === undefined || module.cueId === cueId),
    )
    .sort((left, right) => left.order - right.order || left.createdAt.localeCompare(right.createdAt));
}
