"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CircleStop,
  Eye,
  Gauge,
  ListPlus,
  LockKeyhole,
  MessageSquarePlus,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  UsersRound,
  Zap,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { ResultBars } from "@/components/live/result-bars";
import { useEventCommand } from "@/client/use-event-command";
import { useLiveEventView } from "@/client/use-live-event-view";
import type { AdminView, EventCommand } from "@/domain";

const EVENT_ID = "demo";

function ControlButton({
  label,
  icon,
  tone = "neutral",
  pending,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: React.ReactNode;
  tone?: "neutral" | "lime" | "coral" | "violet";
  pending?: boolean;
}) {
  const tones = {
    neutral: "border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]",
    lime: "border-[var(--pm-lime,#d7ff3f)] bg-[var(--pm-lime,#d7ff3f)] text-[var(--pm-ink,#0b0b14)] hover:brightness-105",
    coral: "border-[var(--pm-coral,#ff5d73)] bg-[var(--pm-coral,#ff5d73)] text-[var(--pm-ink,#0b0b14)] hover:brightness-105",
    violet: "border-[var(--pm-violet,#7c5cff)] bg-[var(--pm-violet,#7c5cff)] text-white hover:brightness-110",
  };

  return (
    <button
      {...props}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-lime,#d7ff3f)] disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${props.className ?? ""}`}
      disabled={props.disabled || pending}
    >
      {icon}
      {pending ? "처리 중…" : label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/40">
      {children}
    </p>
  );
}

export function AdminApp() {
  const { view, error: viewError, connection, refresh } =
    useLiveEventView<AdminView>({ eventId: EVENT_ID, surface: "admin" });
  const { run, pending, error: commandError, clearError } = useEventCommand(
    EVENT_ID,
    refresh,
  );
  const [showComposer, setShowComposer] = useState(false);
  const [quickPrompt, setQuickPrompt] = useState("방금 가장 웃겼던 장면은?");
  const [optionA, setOptionA] = useState("신랑의 대답");
  const [optionB, setOptionB] = useState("신부의 표정");

  const activeInteraction =
    view?.activeCue?.payload.kind === "interaction"
      ? view.activeCue.payload.interaction
      : null;
  const activeMission =
    view?.activeCue?.payload.kind === "mission"
      ? view.activeCue.payload.mission
      : null;

  const nextCueTitle = useMemo(() => {
    if (!view) return "다음 큐";
    const stageIndex = view.stages.findIndex(
      (stage) => stage.id === view.runtime.activeStageId,
    );
    const stage = view.stages[stageIndex];
    const cueIndex = stage?.cues.findIndex(
      (cue) => cue.id === view.runtime.activeCueId,
    );
    if (stage && cueIndex !== undefined && cueIndex >= 0) {
      const nextCue = stage.cues[cueIndex + 1];
      if (nextCue) return nextCue.title;
    }
    return view.stages[stageIndex + 1]?.title ?? "마지막 큐";
  }, [view]);

  if (!view) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--pm-ink,#0b0b14)] p-6 text-white">
        <div className="grid justify-items-center gap-4 text-center" role="status">
          <Gauge className="text-[var(--pm-lime,#d7ff3f)]" size={40} />
          <p className="font-black">쇼 컨트롤을 준비하는 중…</p>
          {viewError ? <p className="text-sm text-[var(--pm-coral,#ff5d73)]">{viewError}</p> : null}
        </div>
      </main>
    );
  }

  const adminView = view;

  async function send(command: EventCommand, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    clearError();
    await run(command, { expectedVersion: adminView.version });
  }

  async function publishQuickQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickPrompt.trim() || !optionA.trim() || !optionB.trim()) return;
    const suffix = crypto.randomUUID();
    const receipt = await run(
      {
        type: "interaction.publish-quick",
        stageId: adminView.runtime.activeStageId ?? undefined,
        afterCueId: adminView.runtime.activeCueId,
        cueId: `cue-quick-${suffix}`,
        cueTitle: "Quick Question",
        interaction: {
          id: `interaction-quick-${suffix}`,
          mode: "poll",
          prompt: quickPrompt.trim(),
          options: [
            { id: "option-a", label: optionA.trim() },
            { id: "option-b", label: optionB.trim() },
          ],
          resultsVisibility: "after-close",
        },
      },
      { expectedVersion: adminView.version },
    );
    if (receipt) setShowComposer(false);
  }

  const draftInteraction = view.interactions.find(
    (interaction) => interaction.phase === "draft",
  );
  const lockedMission = view.missions.find(
    (mission) => mission.status === "locked",
  );

  return (
    <main className="min-h-dvh bg-[var(--pm-ink,#0b0b14)] text-[var(--pm-ivory,#f7f3e8)]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--pm-ink,#0b0b14)]/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--pm-lime,#d7ff3f)] text-[var(--pm-ink,#0b0b14)]">
              <Zap aria-hidden="true" size={22} fill="currentColor" />
            </div>
            <div>
              <p className="text-[0.65rem] font-black tracking-[0.2em] text-white/45">PARTYMAKER / SHOW CONTROL</p>
              <h1 className="text-lg font-black tracking-tight">{view.activeStage?.title ?? "STANDBY"}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3">
              <span className={`size-2 rounded-full ${connection === "live" ? "bg-[var(--pm-lime,#d7ff3f)]" : "bg-[var(--pm-coral,#ff5d73)]"}`} />
              {connection === "live" ? "LIVE SYNC" : "RECONNECTING"}
            </span>
            <span className="flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3">
              <UsersRound aria-hidden="true" size={15} /> {view.participantCount}명
            </span>
            <span className="min-h-9 rounded-full border border-white/10 bg-white/5 px-3 py-2 tabular-nums">v{view.version}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 pb-36 md:p-6 lg:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="rounded-2xl border border-white/10 bg-[var(--pm-surface,#181725)] p-3 lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-2">
            <SectionLabel>Run of show</SectionLabel>
            <span className="text-xs font-bold text-white/35">{view.stages.length} stages</span>
          </div>
          <ol className="mt-2 grid gap-2">
            {view.stages.map((stage, index) => {
              const active = stage.id === view.runtime.activeStageId;
              return (
                <li key={stage.id}>
                  <button
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition focus-visible:outline-2 focus-visible:outline-[var(--pm-lime,#d7ff3f)] ${
                      active
                        ? "border-[var(--pm-lime,#d7ff3f)] bg-[var(--pm-lime,#d7ff3f)] text-[var(--pm-ink,#0b0b14)]"
                        : "border-transparent bg-white/[0.035] text-white/65 hover:border-white/15 hover:text-white"
                    }`}
                    type="button"
                    disabled={Boolean(pending)}
                    data-testid={`stage-${stage.id}`}
                    onClick={() =>
                      void send({
                        type: "runtime.set-stage",
                        stageId: stage.id,
                        cueId: stage.cueOrder[0],
                      })
                    }
                  >
                    <span className="w-5 shrink-0 text-xs font-black tabular-nums opacity-55">{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{stage.title}</span>
                      <span className="block truncate text-[0.7rem] font-bold opacity-55">{stage.cues.length} cues</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="grid content-start gap-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--pm-surface,#181725)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <SectionLabel>Now on air</SectionLabel>
                <h2 className="mt-1 text-xl font-black">{view.activeCue?.title ?? "큐 없음"}</h2>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-black ${view.runtime.paused ? "bg-[var(--pm-cyan,#45d7ff)] text-[var(--pm-ink,#0b0b14)]" : "bg-[var(--pm-coral,#ff5d73)] text-[var(--pm-ink,#0b0b14)]"}`}>
                {view.runtime.paused ? "HOLD" : "ON AIR"}
              </span>
            </div>

            {activeInteraction ? (
              <div className="grid gap-6 p-5 md:p-7">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--pm-violet,#7c5cff)]">{activeInteraction.mode} · {activeInteraction.phase}</p>
                  <h3 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-[-0.035em]">{activeInteraction.prompt}</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <ResultBars
                    results={activeInteraction.results ?? []}
                    correctOptionId={activeInteraction.correctOptionId}
                    showCorrect={activeInteraction.phase === "revealed"}
                  />
                  <div className="grid content-center rounded-xl border border-white/10 bg-black/15 p-4 text-center">
                    <span className="text-4xl font-black tabular-nums">{activeInteraction.totalResponses}</span>
                    <span className="mt-1 text-xs font-black tracking-[0.12em] text-white/45">ANSWERS</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ControlButton
                    label="투표 닫기"
                    icon={<CircleStop aria-hidden="true" size={18} />}
                    disabled={activeInteraction.phase !== "open"}
                    pending={pending === "interaction.close"}
                    data-testid="admin-close"
                    onClick={() => void send({ type: "interaction.close", interactionId: activeInteraction.id })}
                  />
                  <ControlButton
                    label="메인 화면에 결과 공개"
                    icon={<Eye aria-hidden="true" size={18} />}
                    tone="coral"
                    disabled={activeInteraction.phase !== "closed"}
                    pending={pending === "interaction.reveal"}
                    data-testid="admin-reveal"
                    onClick={() =>
                      void send(
                        { type: "interaction.reveal", interactionId: activeInteraction.id },
                        "결과를 공개하면 정답 점수가 한 번 반영됩니다. 지금 공개할까요?",
                      )
                    }
                  />
                </div>
              </div>
            ) : activeMission ? (
              <div className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
                <div>
                  <p className="text-xs font-black tracking-[0.18em] text-[var(--pm-coral,#ff5d73)]">MISSION LIVE</p>
                  <h3 className="mt-3 text-3xl font-black tracking-tight">{activeMission.title}</h3>
                  <p className="mt-3 max-w-2xl text-lg text-white/65">{activeMission.description}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-right">
                  <span className="block text-3xl font-black tabular-nums">{view.missionProgress.filter((progress) => progress.missionId === activeMission.id).length}</span>
                  <span className="text-xs font-bold text-white/45">COMPLETED</span>
                </div>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center p-8 text-center">
                <div>
                  <Sparkles className="mx-auto text-[var(--pm-violet,#7c5cff)]" aria-hidden="true" size={36} />
                  <h3 className="mt-5 text-2xl font-black">
                    {view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom"
                      ? view.activeCue.payload.headline
                      : view.activeCue?.payload.kind === "leaderboard"
                        ? view.activeCue.payload.headline
                        : "다음 큐를 준비하세요."}
                  </h3>
                  <p className="mt-2 text-white/45">Guest와 Screen이 지금 보고 있는 장면입니다.</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[var(--pm-surface,#181725)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel>Quick actions</SectionLabel>
                  <h2 className="mt-1 text-lg font-black">흐름을 지금 바꾸기</h2>
                </div>
                <ListPlus className="text-white/35" aria-hidden="true" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <ControlButton
                  label="질문"
                  icon={<MessageSquarePlus aria-hidden="true" size={18} />}
                  tone="violet"
                  onClick={() => setShowComposer((open) => !open)}
                  data-testid="admin-quick-question"
                />
                <ControlButton
                  label="미션 보내기"
                  icon={<Sparkles aria-hidden="true" size={18} />}
                  tone="coral"
                  disabled={!lockedMission}
                  pending={pending === "mission.publish"}
                  data-testid="admin-publish-mission"
                  onClick={() =>
                    lockedMission
                      ? void send({ type: "mission.publish", missionId: lockedMission.id })
                      : undefined
                  }
                />
                <ControlButton
                  label="준비된 투표"
                  icon={<BarChart3 aria-hidden="true" size={18} />}
                  disabled={!draftInteraction}
                  pending={pending === "interaction.publish"}
                  data-testid="admin-publish-poll"
                  onClick={() =>
                    draftInteraction
                      ? void send({ type: "interaction.publish", interactionId: draftInteraction.id })
                      : undefined
                  }
                />
                <ControlButton
                  label="점수는 우측에서"
                  icon={<Trophy aria-hidden="true" size={18} />}
                  disabled
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[var(--pm-surface,#181725)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel>Output preview</SectionLabel>
                  <h2 className="mt-1 text-lg font-black">메인 화면 미리보기</h2>
                </div>
                <Eye className="text-white/35" aria-hidden="true" />
              </div>
              <div className="mt-5 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black p-5">
                <p className="text-[0.6rem] font-black tracking-[0.18em] text-[var(--pm-lime,#d7ff3f)]">{view.activeStage?.title ?? "STANDBY"}</p>
                <p className="mt-4 line-clamp-3 text-xl font-black leading-tight">
                  {activeInteraction?.prompt ?? activeMission?.description ?? (view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom" ? view.activeCue.payload.headline : "PartyMaker")}
                </p>
                <p className="mt-auto pt-4 text-xs font-bold text-white/35">{view.participantCount} PLAYERS</p>
              </div>
            </div>
          </div>

          {showComposer ? (
            <form className="rounded-2xl border border-[var(--pm-violet,#7c5cff)]/55 bg-[var(--pm-surface,#181725)] p-5" onSubmit={publishQuickQuestion}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SectionLabel>Instant cue</SectionLabel>
                  <h2 className="mt-1 text-xl font-black">방금 생긴 일을 질문으로</h2>
                </div>
                <button className="min-h-11 rounded-lg px-3 text-sm font-bold text-white/55 hover:bg-white/5 hover:text-white" type="button" onClick={() => setShowComposer(false)}>
                  닫기
                </button>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-bold">
                  질문
                  <input className="min-h-12 rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-[var(--pm-lime,#d7ff3f)]" value={quickPrompt} maxLength={100} onChange={(event) => setQuickPrompt(event.target.value)} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">선택 A<input className="min-h-12 rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-[var(--pm-lime,#d7ff3f)]" value={optionA} maxLength={40} onChange={(event) => setOptionA(event.target.value)} /></label>
                  <label className="grid gap-2 text-sm font-bold">선택 B<input className="min-h-12 rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-[var(--pm-lime,#d7ff3f)]" value={optionB} maxLength={40} onChange={(event) => setOptionB(event.target.value)} /></label>
                </div>
                <ControlButton label="하객과 화면에 바로 보내기" icon={<Send aria-hidden="true" size={18} />} tone="lime" pending={pending === "interaction.publish-quick"} type="submit" />
              </div>
            </form>
          ) : null}
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-2xl border border-white/10 bg-[var(--pm-surface,#181725)] p-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <SectionLabel>Audience pulse</SectionLabel>
                <h2 className="mt-1 font-black">최근 입장</h2>
              </div>
              <UsersRound className="text-white/35" aria-hidden="true" size={20} />
            </div>
            <ul className="mt-4 grid max-h-64 gap-2 overflow-y-auto">
              {view.guests.slice(-8).reverse().map((guest) => (
                <li className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-3" key={guest.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{guest.displayName}</p>
                    <p className="truncate text-xs text-white/40">{guest.relationshipCategory} · {guest.yearsKnown}년</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[0.65rem] font-bold text-white/55">{guest.tableId.replace("table-", "").toUpperCase()}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[var(--pm-surface,#181725)] p-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <SectionLabel>Table score</SectionLabel>
                <h2 className="mt-1 font-black">테이블 배틀</h2>
              </div>
              <Trophy className="text-white/35" aria-hidden="true" size={20} />
            </div>
            <ol className="mt-4 grid gap-2">
              {view.tables.map((table) => (
                <li className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-xl bg-white/[0.04] p-2" key={table.id}>
                  <span className="text-center text-xs font-black text-white/35">{table.rank}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{table.name}</p>
                    <p className="text-xs font-bold tabular-nums text-white/45">{table.score} P</p>
                  </div>
                  <button
                    className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-black hover:border-[var(--pm-lime,#d7ff3f)] hover:text-[var(--pm-lime,#d7ff3f)] disabled:opacity-40"
                    type="button"
                    disabled={Boolean(pending)}
                    aria-label={`${table.name}에 10점 추가`}
                    onClick={() =>
                      void send({
                        type: "score.adjust",
                        target: { kind: "table", id: table.id },
                        delta: 10,
                        reason: "MC quick adjustment",
                      })
                    }
                  >
                    +10
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs font-black text-white/40 hover:border-[var(--pm-coral,#ff5d73)] hover:text-[var(--pm-coral,#ff5d73)]"
            type="button"
            data-testid="admin-reset"
            onClick={() =>
              void send(
                { type: "event.reset-demo" },
                "지금까지의 참여자·응답·점수가 모두 초기화됩니다. 데모를 리셋할까요?",
              )
            }
          >
            <RotateCcw aria-hidden="true" size={15} /> 데모 초기화
          </button>
        </aside>
      </div>

      {(commandError || viewError) && (
        <div className="fixed bottom-28 left-1/2 z-40 w-[min(92vw,560px)] -translate-x-1/2 rounded-xl border border-[var(--pm-coral,#ff5d73)]/40 bg-[var(--pm-surface,#181725)] p-4 text-sm font-bold text-[var(--pm-coral,#ff5d73)] shadow-2xl" role="alert">
          {commandError ?? viewError}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[var(--pm-ink,#0b0b14)]/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto grid max-w-[1100px] grid-cols-[auto_auto_minmax(160px,1fr)] gap-2 sm:grid-cols-[auto_auto_auto_minmax(220px,1fr)]">
          <ControlButton
            className="px-3"
            label={view.runtime.paused ? "계속" : "HOLD"}
            icon={view.runtime.paused ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
            tone={view.runtime.paused ? "lime" : "neutral"}
            pending={pending === "runtime.set-paused"}
            data-testid="admin-pause"
            onClick={() => void send({ type: "runtime.set-paused", paused: !view.runtime.paused })}
          />
          <ControlButton
            className="px-3"
            label="이전"
            icon={<ArrowLeft aria-hidden="true" size={18} />}
            pending={pending === "runtime.advance"}
            data-testid="admin-previous"
            onClick={() => void send({ type: "runtime.advance", direction: "previous" })}
          />
          <ControlButton
            className="hidden px-3 sm:flex"
            label={activeInteraction?.phase === "open" ? "투표 닫기" : activeInteraction?.phase === "closed" ? "결과 공개" : "큐 준비"}
            icon={activeInteraction?.phase === "closed" ? <Eye aria-hidden="true" size={18} /> : <LockKeyhole aria-hidden="true" size={18} />}
            disabled={!activeInteraction || activeInteraction.phase === "revealed"}
            tone={activeInteraction?.phase === "closed" ? "coral" : "neutral"}
            onClick={() => {
              if (activeInteraction?.phase === "open") void send({ type: "interaction.close", interactionId: activeInteraction.id });
              if (activeInteraction?.phase === "closed")
                void send(
                  { type: "interaction.reveal", interactionId: activeInteraction.id },
                  "결과를 공개할까요?",
                );
            }}
          />
          <ControlButton
            label={`다음 · ${nextCueTitle}`}
            icon={<ArrowRight aria-hidden="true" size={20} />}
            tone="lime"
            pending={pending === "runtime.advance"}
            data-testid="admin-next"
            onClick={() => void send({ type: "runtime.advance", direction: "next" })}
          />
        </div>
      </div>
    </main>
  );
}
