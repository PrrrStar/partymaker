import type {
  Cue,
  EventState,
  Guest,
  Interaction,
  Mission,
  PartyTable,
  Stage,
} from "./types";

const SEEDED_AT = "2026-09-17T03:32:49.000Z";

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export function createDemoEventState(): EventState {
  const tables: PartyTable[] = [
    { id: "table-a", name: "A TABLE", color: "#ff6b57" },
    { id: "table-b", name: "B TABLE", color: "#ffd166" },
    { id: "table-c", name: "C TABLE", color: "#5eead4" },
    { id: "table-d", name: "D TABLE", color: "#a78bfa" },
  ];

  const stages: Stage[] = [
    {
      id: "stage-check-in",
      title: "CHECK IN",
      shortLabel: "입장",
      description: "하객을 맞이하고 오늘의 분위기를 엽니다.",
      cueOrder: ["cue-welcome"],
    },
    {
      id: "stage-warm-up",
      title: "WARM UP",
      shortLabel: "워밍업",
      cueOrder: ["cue-first-toast"],
    },
    {
      id: "stage-telepathy",
      title: "TELEPATHY",
      shortLabel: "텔레파시",
      cueOrder: ["cue-telepathy-prediction"],
    },
    {
      id: "stage-beat-groom",
      title: "BEAT THE GROOM",
      shortLabel: "신랑을 이겨라",
      cueOrder: ["cue-challenger"],
    },
    {
      id: "stage-table-battle",
      title: "TABLE BATTLE",
      shortLabel: "테이블 배틀",
      cueOrder: ["cue-table-quiz", "cue-table-leaderboard"],
    },
    {
      id: "stage-relationship",
      title: "RELATIONSHIP",
      shortLabel: "관계도",
      cueOrder: ["cue-relationship"],
    },
    {
      id: "stage-secret-mission",
      title: "SECRET MISSION",
      shortLabel: "시크릿 미션",
      cueOrder: ["cue-opposite-side"],
    },
    {
      id: "stage-finale",
      title: "FINALE",
      shortLabel: "피날레",
      cueOrder: ["cue-finale"],
    },
    {
      id: "stage-after-party",
      title: "AFTER PARTY",
      shortLabel: "애프터 파티",
      cueOrder: ["cue-after-party"],
    },
  ];

  const cues: Cue[] = [
    {
      id: "cue-welcome",
      stageId: "stage-check-in",
      title: "Welcome",
      audience: ["guest", "screen"],
      status: "queued",
      payload: {
        kind: "announcement",
        eyebrow: "PARTYMAKER",
        headline: "오늘 밤, 같이 놀 준비됐나요?",
        body: "QR을 찍고 10초 만에 입장하세요.",
      },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-first-toast",
      stageId: "stage-warm-up",
      title: "첫 건배",
      audience: ["guest", "screen"],
      status: "queued",
      payload: { kind: "mission", missionId: "mission-first-toast" },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-telepathy-prediction",
      stageId: "stage-telepathy",
      title: "답이 통할까요?",
      audience: ["guest", "screen"],
      status: "queued",
      payload: {
        kind: "interaction",
        interactionId: "interaction-telepathy-match",
      },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-challenger",
      stageId: "stage-beat-groom",
      title: "Challenger Wanted",
      audience: ["guest", "screen"],
      status: "queued",
      payload: {
        kind: "announcement",
        eyebrow: "CHALLENGER WANTED",
        headline: "신랑에게 도전하시겠습니까?",
        body: "도전자는 곧 공개됩니다.",
      },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-table-quiz",
      stageId: "stage-table-battle",
      title: "커플 퀴즈",
      audience: ["guest", "screen"],
      status: "queued",
      payload: {
        kind: "interaction",
        interactionId: "interaction-table-quiz",
      },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-table-leaderboard",
      stageId: "stage-table-battle",
      title: "Table Leaderboard",
      audience: ["screen"],
      status: "queued",
      payload: { kind: "leaderboard", headline: "TABLE BATTLE" },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-relationship",
      stageId: "stage-relationship",
      title: "Who Is This?",
      audience: ["screen"],
      status: "queued",
      payload: {
        kind: "custom",
        eyebrow: "WHO IS THIS?",
        headline: "이 사람은 누구일까요?",
        body: "힌트가 하나씩 공개됩니다.",
      },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-opposite-side",
      stageId: "stage-secret-mission",
      title: "반대편 하객과 건배",
      audience: ["guest", "screen"],
      status: "queued",
      payload: { kind: "mission", missionId: "mission-opposite-side" },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-finale",
      stageId: "stage-finale",
      title: "Tonight's Winners",
      audience: ["guest", "screen"],
      status: "queued",
      payload: { kind: "leaderboard", headline: "TONIGHT'S WINNERS" },
      createdAt: SEEDED_AT,
    },
    {
      id: "cue-after-party",
      stageId: "stage-after-party",
      title: "After Party",
      audience: ["guest", "screen"],
      status: "queued",
      payload: {
        kind: "announcement",
        eyebrow: "FORMAL PROGRAM: OFF",
        headline: "이제 진짜 파티가 시작됩니다.",
        body: "마시고, 이야기하고, 마음껏 즐겨주세요.",
      },
      createdAt: SEEDED_AT,
    },
  ];

  const missions: Mission[] = [
    {
      id: "mission-first-toast",
      cueId: "cue-first-toast",
      title: "MISSION #01",
      description: "오늘 처음 만난 하객과 건배하세요.",
      unlockPhase: "open",
      status: "locked",
      verification: "self",
      audience: { kind: "all" },
      points: 5,
    },
    {
      id: "mission-opposite-side",
      cueId: "cue-opposite-side",
      title: "SECRET MISSION",
      description: "아직 대화하지 않은 반대편 하객과 건배하세요.",
      unlockPhase: "secret",
      status: "locked",
      verification: "self",
      audience: { kind: "all" },
      points: 10,
    },
  ];

  const interactions: Interaction[] = [
    {
      id: "interaction-telepathy-match",
      mode: "prediction",
      prompt: "두 사람의 답이 통할까요?",
      options: [
        { id: "match", label: "MATCH" },
        { id: "mismatch", label: "MISMATCH" },
      ],
      correctOptionId: "match",
      phase: "draft",
      scoring: { correct: 10, target: "guest" },
      resultsVisibility: "after-close",
      createdAt: SEEDED_AT,
    },
    {
      id: "interaction-table-quiz",
      mode: "quiz",
      prompt: "두 사람 중 배달 주문을 더 자주 하는 사람은?",
      options: [
        { id: "groom", label: "신랑" },
        { id: "bride", label: "신부" },
      ],
      correctOptionId: "groom",
      phase: "draft",
      scoring: { correct: 15, target: "table" },
      resultsVisibility: "after-close",
      createdAt: SEEDED_AT,
    },
  ];

  const guests: Guest[] = [
    {
      id: "guest-minsu",
      displayName: "민수",
      side: "groom",
      relationshipCategory: "school",
      yearsKnown: 13,
      tableId: "table-a",
      relationshipDescription: "술 먹으면 전화하는 형",
      consentToDisplay: true,
      joinedAt: SEEDED_AT,
    },
    {
      id: "guest-jiyoon",
      displayName: "지윤",
      side: "bride",
      relationshipCategory: "work",
      yearsKnown: 4,
      tableId: "table-b",
      relationshipDescription: "야근과 디저트를 함께한 동료",
      consentToDisplay: true,
      joinedAt: SEEDED_AT,
    },
    {
      id: "guest-hyunjun",
      displayName: "현준",
      side: "groom",
      relationshipCategory: "friend",
      yearsKnown: 8,
      tableId: "table-c",
      consentToDisplay: false,
      joinedAt: SEEDED_AT,
    },
    {
      id: "guest-sora",
      displayName: "소라",
      side: "bride",
      relationshipCategory: "club",
      yearsKnown: 6,
      tableId: "table-d",
      relationshipDescription: "여행 계획을 늘 먼저 짜는 친구",
      consentToDisplay: true,
      joinedAt: SEEDED_AT,
    },
  ];

  return {
    schemaVersion: 1,
    version: 1,
    event: {
      id: "demo",
      slug: "demo",
      title: "PARTYMAKER",
      subtitle: "우리의 밤을 더 재미있게",
      status: "live",
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    runtime: {
      activeStageId: "stage-check-in",
      activeCueId: "cue-welcome",
      paused: false,
      screenOverride: null,
      history: [
        {
          stageId: "stage-check-in",
          cueId: "cue-welcome",
          activatedAt: SEEDED_AT,
        },
      ],
    },
    stageOrder: stages.map((stage) => stage.id),
    stages: indexById(stages),
    cues: indexById(cues),
    guests: indexById(guests),
    tables: indexById(tables),
    missions: indexById(missions),
    missionProgress: {},
    interactions: indexById(interactions),
    responses: {},
    scoreEvents: {},
    connections: {},
    facts: {},
  };
}
