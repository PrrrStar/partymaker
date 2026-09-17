"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type {
  AdminView,
  Cue,
  EditableContentInput,
  EventCommand,
  InteractionMode,
} from "@/domain";

type EditableKind = EditableContentInput["kind"];


const contentKindLabels = {
  announcement: "안내",
  mission: "미션",
  interaction: "질문",
  leaderboard: "순위",
  custom: "안내",
} as const;

const interactionPhaseLabels = {
  draft: "준비",
  open: "응답 중",
  closed: "마감",
  revealed: "결과 공개",
} as const;
type FormState = {
  kind: EditableKind;
  cueId?: string;
  cueTitle: string;
  eyebrow: string;
  headline: string;
  body: string;
  missionTitle: string;
  description: string;
  points: string;
  mode: InteractionMode;
  prompt: string;
  options: string;
  correctIndex: string;
  scoreTarget: "guest" | "table";
};

const emptyForm = (kind: EditableKind): FormState => ({
  kind,
  cueTitle:
    kind === "announcement" ? "새 안내" : kind === "mission" ? "새 미션" : "새 질문",
  eyebrow: "",
  headline: "",
  body: "",
  missionTitle: "",
  description: "",
  points: kind === "mission" ? "5" : "0",
  mode: "poll",
  prompt: "",
  options: "선택 A\n선택 B",
  correctIndex: "",
  scoreTarget: "guest",
});

function cueKind(cue: Cue): EditableKind | null {
  if (cue.payload.kind === "announcement" || cue.payload.kind === "custom") {
    return "announcement";
  }
  if (cue.payload.kind === "mission") return "mission";
  if (cue.payload.kind === "interaction") return "interaction";
  return null;
}

function cueSummary(cue: Cue, view: AdminView): string {
  if (cue.payload.kind === "announcement" || cue.payload.kind === "custom") {
    return cue.payload.headline;
  }
  if (cue.payload.kind === "mission") {
    const missionId = cue.payload.missionId;
    return view.missions.find((mission) => mission.id === missionId)?.description ?? "미션 없음";
  }
  if (cue.payload.kind === "interaction") {
    const interactionId = cue.payload.interactionId;
    return view.interactions.find((interaction) => interaction.id === interactionId)?.prompt ?? "질문 없음";
  }
  if (cue.payload.kind === "leaderboard") return cue.payload.headline;
  return cue.title;
}

function interactionForCue(cue: Cue | undefined, view: AdminView) {
  if (!cue || cue.payload.kind !== "interaction") return null;
  const interactionId = cue.payload.interactionId;
  return view.interactions.find((item) => item.id === interactionId) ?? null;
}

function formForCue(cue: Cue, view: AdminView): FormState | null {
  const kind = cueKind(cue);
  if (!kind) return null;
  if (kind === "announcement") {
    const payload = cue.payload.kind === "announcement" || cue.payload.kind === "custom" ? cue.payload : null;
    return {
      ...emptyForm(kind),
      cueId: cue.id,
      cueTitle: cue.title,
      eyebrow: payload?.eyebrow ?? "",
      headline: payload?.headline ?? "",
      body: payload?.body ?? "",
    };
  }
  if (kind === "mission" && cue.payload.kind === "mission") {
    const missionId = cue.payload.missionId;
    const mission = view.missions.find((item) => item.id === missionId);
    if (!mission) return null;
    return {
      ...emptyForm(kind),
      cueId: cue.id,
      cueTitle: cue.title,
      missionTitle: mission.title,
      description: mission.description,
      points: String(mission.points),
    };
  }
  if (kind === "interaction" && cue.payload.kind === "interaction") {
    const interactionId = cue.payload.interactionId;
    const interaction = view.interactions.find((item) => item.id === interactionId);
    if (!interaction) return null;
    const correctIndex = interaction.correctOptionId
      ? interaction.options.findIndex((option) => option.id === interaction.correctOptionId) + 1
      : 0;
    return {
      ...emptyForm(kind),
      cueId: cue.id,
      cueTitle: cue.title,
      mode: interaction.mode,
      prompt: interaction.prompt,
      options: interaction.options.map((option) => option.label).join("\n"),
      correctIndex: correctIndex > 0 ? String(correctIndex) : "",
      points: String(interaction.scoring?.correct ?? 0),
      scoreTarget: interaction.scoring?.target ?? "guest",
    };
  }
  return null;
}

function contentFromForm(form: FormState): EditableContentInput | null {
  if (!form.cueTitle.trim()) return null;
  if (form.kind === "announcement") {
    if (!form.headline.trim()) return null;
    return {
      kind: "announcement",
      cueTitle: form.cueTitle.trim(),
      eyebrow: form.eyebrow.trim() || undefined,
      headline: form.headline.trim(),
      body: form.body.trim() || undefined,
    };
  }
  if (form.kind === "mission") {
    if (!form.missionTitle.trim() || !form.description.trim()) return null;
    return {
      kind: "mission",
      cueTitle: form.cueTitle.trim(),
      title: form.missionTitle.trim(),
      description: form.description.trim(),
      points: Number(form.points),
    };
  }

  const labels = form.options
    .split("\n")
    .map((label) => label.trim())
    .filter(Boolean);
  if (!form.prompt.trim() || labels.length < 2) return null;
  const options = labels.map((label, index) => ({ id: `option-${index + 1}`, label }));
  const correct = Number(form.correctIndex);
  const correctOptionId =
    Number.isInteger(correct) && correct > 0 && correct <= options.length
      ? options[correct - 1].id
      : undefined;
  return {
    kind: "interaction",
    cueTitle: form.cueTitle.trim(),
    mode: form.mode,
    prompt: form.prompt.trim(),
    options,
    correctOptionId,
    points: correctOptionId ? Number(form.points) : 0,
    scoreTarget: form.scoreTarget,
  };
}

export function ContentManager({
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
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const stage = useMemo(
    () => view.stages.find((item) => item.id === stageId) ?? view.stages[0],
    [stageId, view.stages],
  );
  const editingInteraction =
    form?.cueId && stage
      ? interactionForCue(stage.cues.find((cue) => cue.id === form.cueId), view)
      : null;

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
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [onClose, open]);

  if (!open || !stage) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const content = contentFromForm(form);
    if (!content) {
      setFormError("필수 문구와 질문 선택지 두 개 이상을 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(Number(form.points)) || Number(form.points) < 0 || Number(form.points) > 100) {
      setFormError("점수는 0부터 100 사이의 정수로 입력해 주세요.");
      return;
    }
    setFormError(null);
    let applied = false;
    if (form.cueId) {
      applied = await send({ type: "content.update", cueId: form.cueId, content });
    } else {
      const suffix = crypto.randomUUID();
      applied = await send({
        type: "content.create",
        stageId: stage.id,
        afterCueId: stage.cueOrder.at(-1),
        cueId: `cue-custom-${suffix}`,
        contentId: content.kind === "announcement" ? undefined : `${content.kind}-custom-${suffix}`,
        content,
      });
    }
    if (applied) setForm(null);
  }

  return (
    <div className="fixed inset-0 z-50 grid overscroll-contain bg-black/75 p-3 backdrop-blur-sm md:p-8" role="presentation">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="m-auto grid h-[min(90dvh,850px)] w-full max-w-6xl grid-rows-[auto_1fr] overflow-hidden rounded-[var(--pm-radius-lg)] border border-[var(--pm-border-strong)] bg-[var(--pm-ink)] shadow-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-manager-title"
        aria-describedby="content-manager-description"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--pm-border)] px-5 py-4">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-[var(--pm-coral)]">진행 콘텐츠</p>
            <h2 className="mt-1 text-xl font-black" id="content-manager-title">콘텐츠 관리</h2>
            <p className="sr-only" id="content-manager-description">단계별 안내, 미션과 질문을 추가하거나 수정하고 삭제합니다.</p>
          </div>
          <button className="grid size-11 place-items-center border border-[var(--pm-border)] transition-colors hover:border-[var(--pm-brand-orange)] hover:bg-[var(--pm-surface-raised)]" type="button" onClick={onClose} aria-label="콘텐츠 관리 닫기">
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="grid min-h-0 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-b border-[var(--pm-border)] p-4 md:border-b-0 md:border-r">
            <label className="grid gap-2 text-xs font-bold text-white/65">
              편집할 단계
              <select className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="contentStage" autoComplete="off" value={stage.id} onChange={(event) => { setStageId(event.target.value); setForm(null); }}>
                {view.stages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
            <div className="mt-4 grid gap-2">
              {(["announcement", "mission", "interaction"] as const).map((kind) => (
                <button className="flex min-h-11 items-center gap-2 border border-[var(--pm-border)] bg-[var(--pm-surface)] px-3 text-left text-sm font-bold transition-colors hover:border-[var(--pm-coral)] hover:bg-[var(--pm-surface-raised)]" key={kind} type="button" onClick={() => { setForm(emptyForm(kind)); setFormError(null); }}>
                  <Plus aria-hidden="true" size={16} />
                  {kind === "announcement" ? "안내 추가" : kind === "mission" ? "미션 추가" : "질문 추가"}
                </button>
              ))}
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-4 md:p-6">
            {form ? (
              <form className="grid gap-4" onSubmit={submit}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black">{form.cueId ? "콘텐츠 수정" : "콘텐츠 추가"}</h3>
                  <button className="min-h-11 px-3 text-sm font-bold text-white/65 transition-colors hover:bg-white/5 hover:text-white" type="button" onClick={() => setForm(null)}>항목 목록</button>
                </div>
                <label className="grid gap-2 text-sm font-bold">관리용 이름<input className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="cueTitle" autoComplete="off" value={form.cueTitle} maxLength={100} onChange={(event) => update("cueTitle", event.target.value)} /></label>
                {form.kind === "announcement" ? (
                  <>
                    <label className="grid gap-2 text-sm font-bold">상단 짧은 문구 (선택)<input className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="eyebrow" autoComplete="off" value={form.eyebrow} maxLength={80} onChange={(event) => update("eyebrow", event.target.value)} /></label>
                    <label className="grid gap-2 text-sm font-bold">메인 제목<input className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="headline" autoComplete="off" value={form.headline} maxLength={160} onChange={(event) => update("headline", event.target.value)} /></label>
                    <label className="grid gap-2 text-sm font-bold">보조 설명 (선택)<textarea className="min-h-28 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] p-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="body" autoComplete="off" value={form.body} maxLength={300} onChange={(event) => update("body", event.target.value)} /></label>
                  </>
                ) : form.kind === "mission" ? (
                  <>
                    <label className="grid gap-2 text-sm font-bold">하객에게 보일 제목<input className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="missionTitle" autoComplete="off" value={form.missionTitle} maxLength={100} onChange={(event) => update("missionTitle", event.target.value)} /></label>
                    <label className="grid gap-2 text-sm font-bold">미션 내용<textarea className="min-h-28 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] p-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="missionDescription" autoComplete="off" value={form.description} maxLength={240} onChange={(event) => update("description", event.target.value)} /></label>
                    <label className="grid gap-2 text-sm font-bold">완료 점수<input className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="missionPoints" autoComplete="off" inputMode="numeric" type="number" min="0" max="100" step="1" value={form.points} onChange={(event) => update("points", event.target.value)} /></label>
                  </>
                ) : (
                  <>
                    <label className="grid gap-2 text-sm font-bold">질문 형식<select className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="interactionMode" autoComplete="off" value={form.mode} onChange={(event) => update("mode", event.target.value as InteractionMode)}><option value="poll">투표</option><option value="prediction">예측</option><option value="quiz">퀴즈</option><option value="challenge">도전</option></select></label>
                    <label className="grid gap-2 text-sm font-bold">질문<input className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="prompt" autoComplete="off" value={form.prompt} maxLength={240} onChange={(event) => update("prompt", event.target.value)} /></label>
                    <label className="grid gap-2 text-sm font-bold">선택지 (한 줄에 하나)<textarea className="min-h-32 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] p-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="options" autoComplete="off" value={form.options} onChange={(event) => update("options", event.target.value)} /></label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="grid gap-2 text-sm font-bold">정답 번호 (선택)<input className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="correctIndex" autoComplete="off" inputMode="numeric" type="number" min="1" value={form.correctIndex} onChange={(event) => update("correctIndex", event.target.value)} /></label>
                      <label className="grid gap-2 text-sm font-bold">정답 점수<input className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="interactionPoints" autoComplete="off" inputMode="numeric" type="number" min="0" max="100" step="1" value={form.points} onChange={(event) => update("points", event.target.value)} /></label>
                      <label className="grid gap-2 text-sm font-bold">점수 대상<select className="min-h-11 border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] px-3 transition-colors focus-visible:border-[var(--pm-brand-orange)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-brand-orange)]" name="scoreTarget" autoComplete="off" value={form.scoreTarget} onChange={(event) => update("scoreTarget", event.target.value as "guest" | "table")}><option value="guest">개인</option><option value="table">테이블</option></select></label>
                    </div>
                    {editingInteraction && editingInteraction.phase !== "draft" ? (
                      <p className="border border-[var(--pm-coral)]/40 bg-[var(--pm-coral)]/10 p-3 text-sm font-bold text-[var(--pm-coral)]">응답이 시작된 질문은 “투표만 초기화”한 뒤 수정할 수 있습니다.</p>
                    ) : null}
                  </>
                )}
                {formError ? <p className="border border-[var(--pm-coral)]/40 bg-[var(--pm-coral)]/10 p-3 text-sm font-bold text-[var(--pm-coral)]" role="alert">{formError}</p> : null}
                <button className="min-h-12 bg-[var(--pm-coral)] px-5 font-black text-[var(--pm-ink)] transition-[filter,opacity] hover:brightness-95 disabled:opacity-40" type="submit" disabled={busy}>{busy ? "저장 중…" : form.cueId ? "변경사항 저장" : "콘텐츠 추가"}</button>
              </form>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-xs font-black tracking-[0.12em] text-white/60">{stage.title}</p><h3 className="mt-1 text-xl font-black">콘텐츠 {stage.cues.length}개</h3></div>
                  <p className="max-w-sm text-right text-xs leading-relaxed text-white/60">삭제하면 연결된 응답과 반영 점수도 함께 삭제됩니다.</p>
                </div>
                <ol className="mt-5 grid gap-2">
                  {stage.cues.map((cue, index) => {
                    const kind = cueKind(cue);
                    const linkedInteraction = interactionForCue(cue, view);
                    return (
                      <li className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border border-[var(--pm-border)] bg-[var(--pm-surface)] p-3" key={cue.id}>
                        <span className="text-center text-xs font-black text-white/55">{String(index + 1).padStart(2, "0")}</span>
                        <div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-2"><strong className="min-w-0 truncate text-sm">{cue.title}</strong><span className="shrink-0 text-xs font-bold text-[var(--pm-coral)]">{contentKindLabels[cue.payload.kind]}</span>{linkedInteraction ? <span className="shrink-0 text-xs text-white/60">{interactionPhaseLabels[linkedInteraction.phase]}</span> : null}</div><p className="mt-1 truncate text-xs text-white/60">{cueSummary(cue, view)}</p></div>
                        <div className="flex gap-1">
                          <button className="grid size-11 place-items-center border border-[var(--pm-border)] transition-colors hover:border-[var(--pm-brand-orange)] hover:bg-[var(--pm-surface-raised)] disabled:opacity-35" type="button" disabled={!kind || busy} onClick={() => { const next = formForCue(cue, view); if (next) { setForm(next); setFormError(null); } }} aria-label={`${cue.title} 수정`}><Pencil aria-hidden="true" size={15} /></button>
                          <button className="grid size-11 place-items-center border border-[var(--pm-border)] text-[var(--pm-coral)] transition-colors hover:border-[var(--pm-coral)] hover:bg-[var(--pm-coral)]/10 disabled:opacity-35" type="button" disabled={busy} onClick={() => void send({ type: "content.delete", cueId: cue.id }, `“${cue.title}”을 삭제할까요? 연결된 응답과 점수도 함께 정리됩니다.`)} aria-label={`${cue.title} 삭제`}><Trash2 aria-hidden="true" size={15} /></button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
