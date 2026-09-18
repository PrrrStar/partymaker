"use client";

import {
  ArrowDown,
  ArrowUp,
  Clock3,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  AdminView,
  EventCommand,
  EventModule,
  ModuleConfig,
  ModuleDefinitionId,
} from "@/domain";

function remainingMs(module: EventModule, now: number) {
  if (!module.timer) return 0;
  if (module.timer.status !== "running" || !module.timer.endsAt) {
    return module.timer.remainingMs;
  }
  return Math.max(0, Date.parse(module.timer.endsAt) - now);
}

function formatTimer(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function moduleScopeKey(stageId: string, cueId: string) {
  return `${stageId}:${cueId || "stage"}`;
}

export function ModuleManager({
  open,
  view,
  busy,
  send,
  onClose,
}: {
  open: boolean;
  view: AdminView;
  busy: boolean;
  send: (command: EventCommand, confirmMessage?: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [stageId, setStageId] = useState(view.runtime.activeStageId ?? view.stages[0]?.id ?? "");
  const [cueId, setCueId] = useState(view.runtime.activeCueId ?? "");
  const [durationSeconds, setDurationSeconds] = useState(15);
  const [now, setNow] = useState(() => Date.now());
  const dialogRef = useRef<HTMLElement>(null);

  const stage = view.stages.find((item) => item.id === stageId) ?? view.stages[0];
  const scopedModules = useMemo(
    () =>
      view.modules
        .filter(
          (module) =>
            module.stageId === stage?.id && (module.cueId ?? "") === cueId,
        )
        .sort((left, right) => left.order - right.order),
    [cueId, stage?.id, view.modules],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [onClose, open]);

  if (!open || !stage) return null;

  async function addModule(definitionId: ModuleDefinitionId) {
    const suffix = crypto.randomUUID();
    let config: ModuleConfig | undefined;
    if (definitionId === "timer") {
      config = {
        kind: "timer",
        durationSeconds,
        endBehavior: "notify-only",
      };
    }
    await send({
      type: "module.create",
      moduleId: `module-${definitionId}-${suffix}`,
      definitionId,
      stageId: stage.id,
      cueId: cueId || undefined,
      config,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid overscroll-contain bg-black/80 p-3 backdrop-blur-sm md:p-8">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="m-auto grid h-[min(92dvh,900px)] w-full max-w-7xl grid-rows-[auto_1fr] overflow-hidden rounded-[var(--pm-radius-lg)] border border-[var(--pm-border-strong)] bg-[var(--pm-ink)] shadow-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-manager-title"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--pm-border)] px-5 py-4">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-[var(--pm-brand-orange)]">모듈 보관함</p>
            <h2 className="mt-1 text-xl font-black" id="module-manager-title">게임·진행 도구 조립</h2>
          </div>
          <button
            className="grid size-11 place-items-center border border-[var(--pm-border)] transition-colors hover:border-[var(--pm-brand-orange)]"
            type="button"
            aria-label="모듈 관리 닫기"
            onClick={onClose}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[22rem_minmax(0,1fr)] lg:overflow-hidden">
          <aside className="border-b border-[var(--pm-border)] p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-bold">
                단계
                <select
                  className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3"
                  name="moduleStage"
                  autoComplete="off"
                  value={stage.id}
                  onChange={(event) => {
                    const nextStage = view.stages.find((item) => item.id === event.target.value);
                    setStageId(event.target.value);
                    setCueId(nextStage?.cues[0]?.id ?? "");
                  }}
                >
                  {view.stages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                연결 위치
                <select
                  className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3"
                  name="moduleCue"
                  autoComplete="off"
                  value={cueId}
                  onChange={(event) => setCueId(event.target.value)}
                >
                  <option value="">단계 전체</option>
                  {stage.cues.map((cue) => <option key={cue.id} value={cue.id}>{cue.title}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                새 타이머 시간
                <span className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className="min-h-11 min-w-0 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3"
                    name="moduleTimerDuration"
                    autoComplete="off"
                    inputMode="numeric"
                    type="number"
                    min="3"
                    max="3600"
                    value={durationSeconds}
                    onChange={(event) => setDurationSeconds(Number(event.target.value))}
                  />
                  <span className="grid min-h-11 place-items-center px-2 text-sm text-white/60">초</span>
                </span>
              </label>
            </div>

            <div className="mt-6 grid gap-2">
              {view.moduleCatalog.map((definition) => (
                <button
                  className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-3 border border-[var(--pm-border)] bg-[var(--pm-surface)] p-3 text-left transition-colors hover:border-[var(--pm-brand-orange)] hover:bg-[var(--pm-surface-raised)] disabled:opacity-40"
                  key={definition.id}
                  type="button"
                  disabled={busy || (definition.id === "timer" && (!Number.isInteger(durationSeconds) || durationSeconds < 3 || durationSeconds > 3600))}
                  onClick={() => void addModule(definition.id)}
                >
                  <span className="grid size-10 place-items-center rounded-full bg-[var(--pm-brand-orange)] text-[var(--pm-brand-black)]">
                    <Plus aria-hidden="true" size={18} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm">{definition.title}</strong>
                    <span className="mt-1 block text-xs leading-relaxed text-white/60">{definition.description}</span>
                  </span>
                  <span className="text-xs font-bold text-white/50">{definition.slot === "primary" ? "게임" : "오버레이"}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-h-0 p-4 lg:overflow-y-auto lg:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black text-white/60">{stage.title}</p>
                <h3 className="mt-1 text-xl font-black">{cueId ? stage.cues.find((cue) => cue.id === cueId)?.title : "단계 전체"}</h3>
              </div>
              <p className="text-xs text-white/60">게임은 1개, 타이머·점수판은 함께 연결할 수 있습니다.</p>
            </div>

            {scopedModules.length === 0 ? (
              <div className="mt-5 grid min-h-52 place-items-center border border-dashed border-white/20 p-8 text-center text-sm text-white/60">
                왼쪽 보관함에서 게임 또는 진행 도구를 추가하세요.
              </div>
            ) : (
              <ol className="mt-5 grid gap-3">
                {scopedModules.map((module, index) => {
                  const timer = module.config.kind === "timer" ? module.timer : undefined;
                  const milliseconds = timer ? remainingMs(module, now) : 0;
                  return (
                    <li className="grid gap-4 border border-[var(--pm-border)] bg-[var(--pm-surface)] p-4" key={module.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-[var(--pm-brand-orange)]">{module.slot === "primary" ? "게임" : "오버레이"}</span>
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${module.enabled ? "bg-[var(--pm-brand-orange)] text-[var(--pm-brand-black)]" : "bg-white/10 text-white/60"}`}>
                              {module.enabled ? "사용 중" : "꺼짐"}
                            </span>
                          </div>
                          <h4 className="mt-2 truncate text-lg font-black">{module.title}</h4>
                          {timer ? (
                            <p className="mt-2 font-mono text-4xl font-black tabular-nums" aria-live="polite">
                              {formatTimer(milliseconds)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <button className="grid size-11 place-items-center border border-white/15" type="button" disabled={busy || index === 0} aria-label={`${module.title} 위로 이동`} onClick={() => void send({ type: "module.move", moduleId: module.id, direction: "previous" })}><ArrowUp aria-hidden="true" size={16} /></button>
                          <button className="grid size-11 place-items-center border border-white/15" type="button" disabled={busy || index === scopedModules.length - 1} aria-label={`${module.title} 아래로 이동`} onClick={() => void send({ type: "module.move", moduleId: module.id, direction: "next" })}><ArrowDown aria-hidden="true" size={16} /></button>
                          <button className="grid size-11 place-items-center border border-white/15 text-[var(--pm-brand-orange)]" type="button" disabled={busy} aria-label={`${module.title} 삭제`} onClick={() => void send({ type: "module.delete", moduleId: module.id }, `“${module.title}” 모듈을 삭제할까요?`)}><Trash2 aria-hidden="true" size={16} /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="min-h-11 border border-white/15 px-4 text-sm font-bold" type="button" disabled={busy} onClick={() => void send({ type: "module.set-enabled", moduleId: module.id, enabled: !module.enabled })}>
                          {module.enabled ? "사용 중지" : "사용하기"}
                        </button>
                        {timer ? (
                          <>
                            <button className="flex min-h-11 items-center gap-2 border border-white/15 px-4 text-sm font-bold" type="button" disabled={busy || timer.status === "running"} onClick={() => void send({ type: "module.timer.start", moduleId: module.id })}><Play aria-hidden="true" size={16} />{timer.status === "paused" ? "계속" : "시작"}</button>
                            <button className="flex min-h-11 items-center gap-2 border border-white/15 px-4 text-sm font-bold" type="button" disabled={busy || timer.status !== "running"} onClick={() => void send({ type: "module.timer.pause", moduleId: module.id })}><Pause aria-hidden="true" size={16} />일시 정지</button>
                            <button className="flex min-h-11 items-center gap-2 border border-white/15 px-4 text-sm font-bold" type="button" disabled={busy} onClick={() => void send({ type: "module.timer.add-time", moduleId: module.id, seconds: 10 })}><Clock3 aria-hidden="true" size={16} />+10초</button>
                            <button className="flex min-h-11 items-center gap-2 border border-white/15 px-4 text-sm font-bold" type="button" disabled={busy} onClick={() => void send({ type: "module.timer.reset", moduleId: module.id })}><RotateCcw aria-hidden="true" size={16} />초기화</button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="sr-only">현재 모듈 범위: {moduleScopeKey(stage.id, cueId)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
