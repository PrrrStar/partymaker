import { describe, expect, it } from "vitest";
import { MemoryEventStore } from "../server/memory-event-store";
import type { EventCommand, EventState } from ".";
import {
  createDemoEventState,
  reduceEvent,
  selectScreenView,
} from ".";

let commandSequence = 0;

function apply(
  state: EventState,
  command: EventCommand,
  now = "2026-09-17T12:00:00.000Z",
) {
  commandSequence += 1;
  return reduceEvent(state, command, {
    commandId: `test-command-${commandSequence}`,
    now,
  });
}

describe("PartyMaker event reducer", () => {
  it("upserts a locally persisted guest identity without duplicating it", () => {
    const state = createDemoEventState();
    const command: EventCommand = {
      type: "guest.join",
      guest: {
        id: "guest-new",
        displayName: "새하객",
        side: "other",
        relationshipCategory: "friend",
        yearsKnown: 2,
        tableId: "table-a",
        consentToDisplay: true,
      },
    };

    const first = apply(state, command);
    const duplicate = apply(first.state, command);

    expect(first.changed).toBe(true);
    expect(duplicate.changed).toBe(false);
    expect(Object.keys(duplicate.state.guests)).toHaveLength(5);
    expect(duplicate.result).toEqual({ guestId: "guest-new", tableId: "table-a" });
  });

  it("automatically keeps companion groups on the same balanced team", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "guest.join",
      guest: {
        id: "guest-companion-a",
        displayName: "일행A",
        side: "groom",
        relationshipCategory: "other",
        relationshipDescription: "신랑의 동네 친구",
        yearsKnownText: "중학교 때부터",
        companionGroup: "성수동 친구들",
        consentToDisplay: true,
      },
    }).state;
    state = apply(state, {
      type: "guest.join",
      guest: {
        id: "guest-companion-b",
        displayName: "일행B",
        side: "groom",
        relationshipCategory: "friend",
        yearsKnownText: "10년쯤",
        companionGroup: " 성수동 친구들 ",
        consentToDisplay: true,
      },
    }).state;

    const first = state.guests["guest-companion-a"];
    const second = state.guests["guest-companion-b"];
    expect(first.tableId).toBe(second.tableId);
    expect(first.yearsKnownText).toBe("중학교 때부터");
    expect(first.avatarStyle).toMatch(/round|tall|star/);
  });

  it("publishes a quick interaction and its cue atomically", () => {
    const state = createDemoEventState();
    const result = apply(state, {
      type: "interaction.publish-quick",
      cueId: "cue-quick",
      interaction: {
        id: "interaction-quick",
        mode: "poll",
        prompt: "지금 한 곡 더 들을까요?",
        options: [
          { id: "yes", label: "좋아요" },
          { id: "no", label: "다음 게임" },
        ],
      },
    });

    expect(result.changed).toBe(true);
    expect(result.state.interactions["interaction-quick"].phase).toBe("open");
    expect(result.state.runtime.activeCueId).toBe("cue-quick");
    expect(result.state.cues["cue-quick"].stageId).toBe("stage-check-in");
    expect(result.state.stages["stage-check-in"].cueOrder).toContain("cue-quick");
  });

  it("keeps close and reveal separate and awards a correct answer exactly once", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "interaction.publish",
      interactionId: "interaction-telepathy-match",
    }).state;
    state = apply(state, {
      type: "interaction.respond",
      interactionId: "interaction-telepathy-match",
      guestId: "guest-minsu",
      optionId: "match",
    }).state;

    const closed = apply(state, {
      type: "interaction.close",
      interactionId: "interaction-telepathy-match",
    });
    expect(closed.state.interactions["interaction-telepathy-match"].phase).toBe(
      "closed",
    );
    expect(Object.keys(closed.state.scoreEvents)).toHaveLength(0);

    const revealed = apply(closed.state, {
      type: "interaction.reveal",
      interactionId: "interaction-telepathy-match",
    });
    const duplicateReveal = apply(revealed.state, {
      type: "interaction.reveal",
      interactionId: "interaction-telepathy-match",
    });

    expect(revealed.state.interactions["interaction-telepathy-match"].phase).toBe(
      "revealed",
    );
    expect(Object.values(revealed.state.scoreEvents)).toHaveLength(1);
    expect(Object.values(revealed.state.scoreEvents)[0]).toMatchObject({
      target: { kind: "guest", id: "guest-minsu" },
      delta: 10,
    });
    expect(duplicateReveal.changed).toBe(false);
    expect(Object.values(duplicateReveal.state.scoreEvents)).toHaveLength(1);
  });

  it("rejects answers after voting closes", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "interaction.publish",
      interactionId: "interaction-telepathy-match",
    }).state;
    state = apply(state, {
      type: "interaction.close",
      interactionId: "interaction-telepathy-match",
    }).state;

    expect(() =>
      apply(state, {
        type: "interaction.respond",
        interactionId: "interaction-telepathy-match",
        guestId: "guest-minsu",
        optionId: "match",
      }),
    ).toThrowError("Voting is not open");
  });

  it("publishes and completes a mission without duplicate points", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "mission.publish",
      missionId: "mission-first-toast",
    }).state;
    const completed = apply(state, {
      type: "mission.complete",
      missionId: "mission-first-toast",
      guestId: "guest-minsu",
    });
    const duplicate = apply(completed.state, {
      type: "mission.complete",
      missionId: "mission-first-toast",
      guestId: "guest-minsu",
    });

    expect(completed.changed).toBe(true);
    expect(duplicate.changed).toBe(false);
    expect(Object.values(duplicate.state.missionProgress)).toHaveLength(1);
    expect(Object.values(duplicate.state.scoreEvents)).toHaveLength(1);
  });

  it("keeps screen results hidden until the reveal command", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "interaction.publish",
      interactionId: "interaction-telepathy-match",
    }).state;
    state = apply(state, {
      type: "interaction.respond",
      interactionId: "interaction-telepathy-match",
      guestId: "guest-minsu",
      optionId: "match",
    }).state;

    const openView = selectScreenView(state);
    expect(
      openView.activeCue?.payload.kind === "interaction"
        ? openView.activeCue.payload.interaction.results
        : undefined,
    ).toBeUndefined();

    state = apply(state, {
      type: "interaction.close",
      interactionId: "interaction-telepathy-match",
    }).state;
    const closedView = selectScreenView(state);
    expect(
      closedView.activeCue?.payload.kind === "interaction"
        ? closedView.activeCue.payload.interaction.results
        : undefined,
    ).toBeUndefined();

    state = apply(state, {
      type: "interaction.reveal",
      interactionId: "interaction-telepathy-match",
    }).state;
    const revealedView = selectScreenView(state);
    expect(
      revealedView.activeCue?.payload.kind === "interaction"
        ? revealedView.activeCue.payload.interaction.results?.[0]
        : undefined,
    ).toMatchObject({ optionId: "match", count: 1, percentage: 100 });
  });

  it("reopens a closed interaction before reveal without losing responses", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "interaction.publish",
      interactionId: "interaction-telepathy-match",
    }).state;
    state = apply(state, {
      type: "interaction.respond",
      interactionId: "interaction-telepathy-match",
      guestId: "guest-minsu",
      optionId: "match",
    }).state;
    state = apply(state, {
      type: "interaction.close",
      interactionId: "interaction-telepathy-match",
    }).state;

    const reopened = apply(state, {
      type: "interaction.reopen",
      interactionId: "interaction-telepathy-match",
    });

    expect(reopened.state.interactions["interaction-telepathy-match"].phase).toBe("open");
    expect(Object.values(reopened.state.responses)).toHaveLength(1);
    expect(() =>
      apply(reopened.state, {
        type: "interaction.reveal",
        interactionId: "interaction-telepathy-match",
      }),
    ).toThrowError("Close voting before revealing");
  });

  it("resets one revealed interaction and rolls back only its responses and scores", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "interaction.publish",
      interactionId: "interaction-telepathy-match",
    }).state;
    state = apply(state, {
      type: "interaction.respond",
      interactionId: "interaction-telepathy-match",
      guestId: "guest-minsu",
      optionId: "match",
    }).state;
    state = apply(state, {
      type: "interaction.close",
      interactionId: "interaction-telepathy-match",
    }).state;
    state = apply(state, {
      type: "interaction.reveal",
      interactionId: "interaction-telepathy-match",
    }).state;

    const reset = apply(state, {
      type: "interaction.reset",
      interactionId: "interaction-telepathy-match",
    });

    expect(reset.state.interactions["interaction-telepathy-match"].phase).toBe("draft");
    expect(Object.values(reset.state.responses)).toHaveLength(0);
    expect(Object.values(reset.state.scoreEvents)).toHaveLength(0);
    expect(reset.state.runtime.activeCueId).toBe("cue-telepathy-intro");
  });

  it("creates, updates, and cascade-deletes editable mission content", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "content.create",
      stageId: "stage-warm-up",
      afterCueId: "cue-warmup-cheer",
      cueId: "cue-custom-mission",
      contentId: "mission-custom",
      content: {
        kind: "mission",
        cueTitle: "새 미션",
        title: "MISSION · 테스트",
        description: "다른 테이블 사람과 오늘 가장 기억나는 장면을 이야기하세요.",
        points: 7,
      },
    }).state;

    expect(state.stages["stage-warm-up"].cueOrder.at(-1)).toBe("cue-custom-mission");
    expect(state.missions["mission-custom"]).toMatchObject({ points: 7, status: "locked" });

    state = apply(state, {
      type: "content.update",
      cueId: "cue-custom-mission",
      content: {
        kind: "mission",
        cueTitle: "수정한 미션",
        title: "MISSION · 수정",
        description: "옆 테이블 하객과 서로의 이름과 공통점을 확인하세요.",
        points: 9,
      },
    }).state;
    expect(state.cues["cue-custom-mission"].title).toBe("수정한 미션");
    expect(state.missions["mission-custom"].points).toBe(9);

    state = apply(state, { type: "runtime.activate-cue", cueId: "cue-custom-mission" }).state;
    const deleted = apply(state, { type: "content.delete", cueId: "cue-custom-mission" });
    expect(deleted.state.cues["cue-custom-mission"]).toBeUndefined();
    expect(deleted.state.missions["mission-custom"]).toBeUndefined();
    expect(deleted.state.runtime.activeCueId).not.toBe("cue-custom-mission");
  });

  it("creates, updates, and deletes announcement content", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "content.create",
      stageId: "stage-check-in",
      afterCueId: "cue-checkin-mood",
      cueId: "cue-custom-announcement",
      content: {
        kind: "announcement",
        cueTitle: "새 안내",
        eyebrow: "NOTICE",
        headline: "잠시 후 첫 게임을 시작합니다.",
        body: "휴대폰을 켜고 메인 화면을 봐주세요.",
      },
    }).state;
    expect(state.cues["cue-custom-announcement"].payload).toMatchObject({
      kind: "announcement",
      headline: "잠시 후 첫 게임을 시작합니다.",
    });

    state = apply(state, {
      type: "content.update",
      cueId: "cue-custom-announcement",
      content: {
        kind: "announcement",
        cueTitle: "수정 안내",
        headline: "첫 게임을 지금 시작합니다.",
      },
    }).state;
    expect(state.cues["cue-custom-announcement"].title).toBe("수정 안내");

    state = apply(state, { type: "content.delete", cueId: "cue-custom-announcement" }).state;
    expect(state.cues["cue-custom-announcement"]).toBeUndefined();
  });

  it("cascade-deletes interaction responses and awarded scores", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "content.create",
      stageId: "stage-check-in",
      afterCueId: "cue-checkin-mood",
      cueId: "cue-custom-quiz",
      contentId: "interaction-custom-quiz",
      content: {
        kind: "interaction",
        cueTitle: "새 퀴즈",
        mode: "quiz",
        prompt: "두 선택지 중 정답을 골라주세요.",
        options: [
          { id: "option-1", label: "정답" },
          { id: "option-2", label: "오답" },
        ],
        correctOptionId: "option-1",
        points: 5,
        scoreTarget: "guest",
      },
    }).state;
    state = apply(state, {
      type: "content.update",
      cueId: "cue-custom-quiz",
      content: {
        kind: "interaction",
        cueTitle: "수정 퀴즈",
        mode: "quiz",
        prompt: "수정된 질문의 정답을 골라주세요.",
        options: [
          { id: "option-1", label: "첫 번째" },
          { id: "option-2", label: "두 번째" },
        ],
        correctOptionId: "option-2",
        points: 7,
        scoreTarget: "guest",
      },
    }).state;
    state = apply(state, {
      type: "interaction.publish",
      interactionId: "interaction-custom-quiz",
    }).state;
    state = apply(state, {
      type: "interaction.respond",
      interactionId: "interaction-custom-quiz",
      guestId: "guest-minsu",
      optionId: "option-2",
    }).state;
    state = apply(state, {
      type: "interaction.close",
      interactionId: "interaction-custom-quiz",
    }).state;
    state = apply(state, {
      type: "interaction.reveal",
      interactionId: "interaction-custom-quiz",
    }).state;
    expect(Object.values(state.responses)).toHaveLength(1);
    expect(Object.values(state.scoreEvents)).toHaveLength(1);

    const deleted = apply(state, { type: "content.delete", cueId: "cue-custom-quiz" });
    expect(deleted.state.interactions["interaction-custom-quiz"]).toBeUndefined();
    expect(Object.values(deleted.state.responses)).toHaveLength(0);
    expect(Object.values(deleted.state.scoreEvents)).toHaveLength(0);
  });
  it("starts an attached timer with voting and rejects late responses", () => {
    let state = createDemoEventState();
    state = apply(
      state,
      { type: "interaction.publish", interactionId: "interaction-checkin-mood" },
      "2026-09-17T12:00:00.000Z",
    ).state;

    expect(state.modules?.["module-timer-checkin-mood"].timer).toMatchObject({
      status: "running",
      endsAt: "2026-09-17T12:00:08.000Z",
    });
    expect(() =>
      apply(
        state,
        {
          type: "interaction.respond",
          interactionId: "interaction-checkin-mood",
          guestId: "guest-minsu",
          optionId: "high",
        },
        "2026-09-17T12:00:09.000Z",
      ),
    ).toThrowError("The response timer has ended");
  });

  it("creates and operates a cue-scoped timer module", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "module.create",
      moduleId: "module-timer-test",
      definitionId: "timer",
      stageId: "stage-check-in",
      cueId: "cue-welcome",
      config: { kind: "timer", durationSeconds: 15, endBehavior: "notify-only" },
    }).state;

    expect(state.modules?.["module-timer-test"]).toMatchObject({
      slot: "overlay",
      enabled: true,
      timer: { status: "idle", remainingMs: 15_000 },
    });

    state = apply(
      state,
      { type: "module.timer.start", moduleId: "module-timer-test" },
      "2026-09-17T12:00:00.000Z",
    ).state;
    expect(state.modules?.["module-timer-test"].timer).toMatchObject({
      status: "running",
      endsAt: "2026-09-17T12:00:15.000Z",
    });

    state = apply(
      state,
      { type: "module.timer.pause", moduleId: "module-timer-test" },
      "2026-09-17T12:00:05.000Z",
    ).state;
    expect(state.modules?.["module-timer-test"].timer).toMatchObject({
      status: "paused",
      remainingMs: 10_000,
    });

    state = apply(state, {
      type: "module.timer.add-time",
      moduleId: "module-timer-test",
      seconds: 10,
    }).state;
    expect(state.modules?.["module-timer-test"].timer?.remainingMs).toBe(20_000);

    state = apply(state, { type: "module.timer.reset", moduleId: "module-timer-test" }).state;
    expect(state.modules?.["module-timer-test"].timer).toMatchObject({
      status: "idle",
      remainingMs: 15_000,
    });
  });

  it("keeps one enabled primary module per scope and allows modular replacement", () => {
    let state = createDemoEventState();
    state = apply(state, {
      type: "module.create",
      moduleId: "module-tournament-test",
      definitionId: "tournament",
      stageId: "stage-table-battle",
      cueId: "cue-table-intro",
    }).state;

    expect(() =>
      apply(state, {
        type: "module.create",
        moduleId: "module-league-test",
        definitionId: "league",
        stageId: "stage-table-battle",
        cueId: "cue-table-intro",
      }),
    ).toThrowError("Disable the current primary module");

    state = apply(state, {
      type: "module.set-enabled",
      moduleId: "module-tournament-test",
      enabled: false,
    }).state;
    state = apply(state, {
      type: "module.create",
      moduleId: "module-league-test",
      definitionId: "league",
      stageId: "stage-table-battle",
      cueId: "cue-table-intro",
    }).state;
    state = apply(state, {
      type: "module.delete",
      moduleId: "module-tournament-test",
    }).state;

    expect(state.modules?.["module-tournament-test"]).toBeUndefined();
    expect(state.modules?.["module-league-test"]).toMatchObject({
      definitionId: "league",
      enabled: true,
      slot: "primary",
    });
  });
});

describe("MemoryEventStore", () => {
  it("serializes commands, caches receipts, and broadcasts only real changes", async () => {
    const store = new MemoryEventStore();
    const versions: number[] = [];
    const unsubscribe = store.subscribe("demo", ({ version }) => versions.push(version));
    const envelope = {
      commandId: "join-once",
      expectedVersion: 1,
      command: {
        type: "guest.join" as const,
        guest: {
          id: "guest-idempotent",
          displayName: "한번만",
          side: "other" as const,
          relationshipCategory: "other" as const,
          yearsKnown: 0,
          tableId: "table-d",
          consentToDisplay: false,
        },
      },
    };

    const [first, duplicate] = await Promise.all([
      store.dispatch("demo", envelope),
      store.dispatch("demo", envelope),
    ]);
    unsubscribe();

    expect(first).toEqual(duplicate);
    expect(first.version).toBe(2);
    expect(store.getState("demo")?.version).toBe(2);
    expect(versions).toEqual([2]);
  });

  it("resets demo data as a versioned, broadcast command", async () => {
    const store = new MemoryEventStore();
    await store.dispatch("demo", {
      commandId: "join-before-reset",
      command: {
        type: "guest.join",
        guest: {
          id: "guest-reset-me",
          displayName: "리셋대상",
          side: "other",
          relationshipCategory: "other",
          yearsKnown: 0,
          tableId: "table-a",
          consentToDisplay: false,
        },
      },
    });
    const receipt = await store.dispatch("demo", {
      commandId: "reset-demo",
      expectedVersion: 2,
      command: { type: "event.reset-demo" },
    });

    expect(receipt).toMatchObject({ status: "applied", version: 3 });
    expect(store.getState("demo")?.guests["guest-reset-me"]).toBeUndefined();
    expect(Object.keys(store.getState("demo")?.guests ?? {})).toHaveLength(4);
  });

  it("rejects the second of two admin commands based on the same version", async () => {
    const store = new MemoryEventStore();
    const [first, second] = await Promise.allSettled([
      store.dispatch("demo", {
        commandId: "pause-first",
        expectedVersion: 1,
        command: { type: "runtime.set-paused", paused: true },
      }),
      store.dispatch("demo", {
        commandId: "pause-stale",
        expectedVersion: 1,
        command: { type: "runtime.set-paused", paused: false },
      }),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.status).toBe("rejected");
    expect(second.status === "rejected" ? second.reason : null).toMatchObject({
      code: "version-conflict",
      status: 409,
    });
    expect(store.getState("demo")?.runtime.paused).toBe(true);
    expect(store.getState("demo")?.version).toBe(2);
  });
});
