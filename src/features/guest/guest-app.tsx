"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  CircleDot,
  LockKeyhole,
  PartyPopper,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { ResultBars } from "@/components/live/result-bars";
import { useEventCommand } from "@/client/use-event-command";
import { useLiveEventView } from "@/client/use-live-event-view";
import type {
  GuestSide,
  GuestView,
  RelationshipCategory,
} from "@/domain";

const EVENT_ID = "demo";
const GUEST_ID_KEY = "partymaker:demo:guest-id";

const sides: { value: GuestSide; label: string }[] = [
  { value: "groom", label: "신랑 측" },
  { value: "bride", label: "신부 측" },
  { value: "family", label: "가족" },
  { value: "other", label: "그 외" },
];

const relationships: { value: RelationshipCategory; label: string }[] = [
  { value: "friend", label: "친구" },
  { value: "school", label: "학교" },
  { value: "work", label: "직장" },
  { value: "family", label: "가족" },
  { value: "club", label: "동아리" },
  { value: "other", label: "그 외" },
];

const durations = [
  { value: 0, label: "1년 미만" },
  { value: 2, label: "1–3년" },
  { value: 6, label: "4–9년" },
  { value: 10, label: "10년+" },
];

function Picker<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-bold text-[var(--pm-muted)]">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              className={`min-h-12 rounded-[var(--pm-radius-md)] border px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-lime,#d7ff3f)] ${
                selected
                  ? "border-[var(--pm-lime,#d7ff3f)] bg-[var(--pm-lime,#d7ff3f)] text-[var(--pm-ink,#0b0b14)]"
                  : "border-[var(--pm-border-strong)] bg-[var(--pm-surface-raised)] text-[var(--pm-ivory)] hover:border-[var(--pm-border-strong)] hover:bg-[var(--pm-surface-soft)]"
              }`}
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function GuestApp() {
  const [guestId, setGuestId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(GUEST_ID_KEY),
  );
  const [displayName, setDisplayName] = useState("");
  const [side, setSide] = useState<GuestSide>("groom");
  const [relationshipCategory, setRelationshipCategory] =
    useState<RelationshipCategory>("friend");
  const [yearsKnown, setYearsKnown] = useState(2);
  const [tableId, setTableId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("table") ?? "",
  );
  const [relationshipDescription, setRelationshipDescription] = useState("");
  const [consentToDisplay, setConsentToDisplay] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { view, error: viewError, connection, refresh } =
    useLiveEventView<GuestView>({
      eventId: EVENT_ID,
      surface: "guest",
      guestId,
    });
  const { run, pending, error: commandError } = useEventCommand(
    EVENT_ID,
    refresh,
  );

  const selectedTableId =
    view?.tables.find(
      (table) => table.id === tableId || table.name === tableId,
    )?.id ??
    view?.tables[0]?.id ??
    "";

  const interaction =
    view?.activeCue?.payload.kind === "interaction"
      ? view.activeCue.payload.interaction
      : null;
  const mission =
    view?.activeCue?.payload.kind === "mission"
      ? view.activeCue.payload.mission
      : null;

  const liveKey = useMemo(() => {
    if (view?.paused) return "paused";
    if (!view?.activeCue) return "waiting";
    if (interaction) return `${interaction.id}:${interaction.phase}`;
    if (mission) return `${mission.id}:${mission.completed}`;
    return view.activeCue.id;
  }, [interaction, mission, view?.activeCue, view?.paused]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!displayName.trim()) {
      setFormError("불릴 이름을 적어주세요.");
      return;
    }
    if (!selectedTableId) {
      setFormError("테이블을 골라주세요.");
      return;
    }
    if (!consentToDisplay) {
      setFormError("게임 참여를 위한 화면 표시 동의가 필요해요.");
      return;
    }

    const id = guestId ?? `guest-${crypto.randomUUID()}`;
    const receipt = await run({
      type: "guest.join",
      guest: {
        id,
        displayName: displayName.trim(),
        side,
        relationshipCategory,
        yearsKnown,
        tableId: selectedTableId,
        relationshipDescription: relationshipDescription.trim() || undefined,
        consentToDisplay,
      },
    });

    if (receipt) {
      window.localStorage.setItem(GUEST_ID_KEY, id);
      setGuestId(id);
      await refresh();
    }
  }

  async function answer(optionId: string) {
    if (!guestId || !interaction || interaction.phase !== "open") return;
    await run({
      type: "interaction.respond",
      interactionId: interaction.id,
      guestId,
      optionId,
    });
  }

  async function completeMission() {
    if (!guestId || !mission || mission.completed) return;
    await run({ type: "mission.complete", missionId: mission.id, guestId });
  }

  if (!view) {
    return (
      <main className="pm-guest-shell grid min-h-dvh place-items-center px-6">
        <div className="grid justify-items-center gap-4 text-center" role="status">
          <span className="size-10 animate-spin rounded-full border-2 border-[var(--pm-border-strong)] border-t-[var(--pm-lime,#d7ff3f)]" />
          <p className="font-bold">파티에 연결하는 중…</p>
          {viewError ? <p className="text-sm text-[var(--pm-coral,#ff5d73)]">{viewError}</p> : null}
        </div>
      </main>
    );
  }

  if (!view.guest) {
    return (
      <main className="pm-guest-shell min-h-dvh px-4 py-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto grid w-full max-w-xl gap-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <header className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-black tracking-[0.22em] text-[var(--pm-lime,#d7ff3f)]">PARTYMAKER</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">오늘 밤의 플레이어 등록</h1>
            </div>
            <div className="rounded-full border border-[var(--pm-border)] bg-[var(--pm-surface-raised)] px-3 py-2 text-xs font-bold text-[var(--pm-muted)]">
              {view.participantCount}명 입장
            </div>
          </header>

          <section className="overflow-hidden rounded-[var(--pm-radius-xl)] border border-[var(--pm-border)] bg-[var(--pm-surface,#181725)] shadow-[var(--pm-shadow-card)]">
            <div className="border-b border-[var(--pm-border)] bg-[var(--pm-violet,#7c5cff)] p-6 text-[var(--pm-ink,#0b0b14)]">
              <Sparkles aria-hidden="true" size={28} strokeWidth={2.4} />
              <p className="mt-7 text-sm font-black tracking-[0.14em]">QR → JOIN → PLAY</p>
              <h2 className="mt-2 max-w-md text-3xl font-black leading-tight tracking-[-0.04em]">
                이름만 불러도 모두가 아는 파티를 만들어요.
              </h2>
            </div>

            <form className="grid gap-7 p-5 sm:p-7" onSubmit={join}>
              <label className="grid gap-2 text-sm font-bold" htmlFor="display-name">
                오늘 불릴 이름
                <input
                  className="min-h-14 rounded-[var(--pm-radius-md)] border border-[var(--pm-border-strong)] bg-[var(--pm-surface-raised)] px-4 text-lg font-bold text-[var(--pm-ivory)] outline-none transition focus:border-[var(--pm-lime,#d7ff3f)] focus:ring-2 focus:ring-[var(--pm-lime,#d7ff3f)]/25"
                  id="display-name"
                  name="displayName"
                  autoComplete="nickname"
                  maxLength={20}
                  placeholder="예: 지민"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>

              <Picker label="어느 쪽 하객인가요?" value={side} options={sides} onChange={setSide} />
              <Picker
                label="어떤 인연인가요?"
                value={relationshipCategory}
                options={relationships}
                onChange={setRelationshipCategory}
              />
              <Picker
                label="알고 지낸 시간"
                value={yearsKnown}
                options={durations}
                onChange={setYearsKnown}
              />

              <fieldset className="grid gap-3">
                <legend className="text-sm font-bold text-[var(--pm-muted)]">내 테이블</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {view.tables.map((table) => {
                    const selected = table.id === selectedTableId;
                    return (
                      <button
                        className={`min-h-12 rounded-[var(--pm-radius-md)] border px-3 text-sm font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-lime,#d7ff3f)] ${
                          selected
                            ? "border-[var(--pm-cyan)] bg-[var(--pm-cyan)] text-[#071018]"
                            : "border-[var(--pm-border-strong)] bg-[var(--pm-surface-raised)] text-[var(--pm-ivory)] hover:border-[var(--pm-border-strong)]"
                        }`}
                        key={table.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setTableId(table.id)}
                      >
                        <span
                          className="mr-2 inline-block size-2 rounded-full"
                          style={{ backgroundColor: table.color }}
                        />
                        {table.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="grid gap-2 text-sm font-bold" htmlFor="relationship-description">
                신랑·신부에게 나는? <span className="font-medium text-[var(--pm-muted)]">선택</span>
                <input
                  className="min-h-12 rounded-[var(--pm-radius-md)] border border-[var(--pm-border-strong)] bg-[var(--pm-surface-raised)] px-4 text-[var(--pm-ivory)] outline-none transition focus:border-[var(--pm-lime,#d7ff3f)]"
                  id="relationship-description"
                  maxLength={50}
                  placeholder="예: 술 먹으면 전화하는 형"
                  value={relationshipDescription}
                  onChange={(event) => setRelationshipDescription(event.target.value)}
                />
              </label>

              <label className="flex cursor-pointer gap-3 rounded-[var(--pm-radius-md)] border border-[var(--pm-border)] bg-[var(--pm-surface-soft)] p-4 text-sm leading-relaxed text-[var(--pm-muted)]">
                <input
                  className="mt-0.5 size-5 shrink-0 accent-[var(--pm-lime,#d7ff3f)]"
                  type="checkbox"
                  checked={consentToDisplay}
                  onChange={(event) => setConsentToDisplay(event.target.checked)}
                />
                <span>선택한 프로필 정보가 오늘의 게임과 메인 화면에 표시되는 것에 동의합니다.</span>
              </label>

              {formError || commandError ? (
                <p className="rounded-[var(--pm-radius-md)] bg-[var(--pm-coral,#ff5d73)]/15 p-3 text-sm font-bold text-[var(--pm-coral,#ff5d73)]" role="alert">
                  {formError ?? commandError}
                </p>
              ) : null}

              <button
                className="flex min-h-14 items-center justify-center gap-2 rounded-[var(--pm-radius-md)] bg-[var(--pm-coral)] px-5 text-base font-black text-white shadow-[var(--pm-shadow-card)] transition hover:brightness-95 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
                type="submit"
                disabled={Boolean(pending)}
                data-testid="join-party"
              >
                {pending ? "입장 중…" : "파티 입장"}
                {!pending ? <ArrowRight aria-hidden="true" size={20} /> : null}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pm-guest-shell min-h-dvh px-4 py-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col gap-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="text-[0.65rem] font-black tracking-[0.22em] text-[var(--pm-lime,#d7ff3f)]">LIVE CONTROLLER</p>
            <p className="mt-1 text-lg font-black">{view.guest.displayName}님, 즐겨요.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--pm-border)] bg-[var(--pm-surface-raised)] px-3 py-2 text-xs font-bold">
            <span className={`size-2 rounded-full ${connection === "live" ? "bg-[var(--pm-lime,#d7ff3f)]" : "bg-[var(--pm-coral,#ff5d73)]"}`} />
            {connection === "live" ? "LIVE" : "연결 중"}
          </div>
        </header>

        <div className="flex items-center justify-between gap-3 rounded-[var(--pm-radius-md)] border border-[var(--pm-border)] bg-[var(--pm-surface-raised)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-black tracking-[0.17em] text-[var(--pm-muted)]">CURRENT STAGE</p>
            <p className="truncate text-sm font-black text-[var(--pm-ivory)]">{view.activeStage?.title ?? "WAITING"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-bold text-[var(--pm-muted)]">
            <span>{view.participantCount}명 참여</span>
            <span className="h-4 w-px bg-[var(--pm-border-strong)]" />
            <span>{view.score.guest} P</span>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            className="flex flex-1 flex-col overflow-hidden rounded-[var(--pm-radius-xl)] border border-[var(--pm-border)] bg-[var(--pm-surface,#181725)] shadow-[var(--pm-shadow-card)]"
            key={liveKey}
            initial={{ opacity: 0, transform: "translateY(12px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {view.paused ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <LockKeyhole className="mx-auto text-[var(--pm-cyan,#45d7ff)]" aria-hidden="true" size={42} />
                  <p className="mt-6 text-xs font-black tracking-[0.18em] text-[var(--pm-cyan,#45d7ff)]">HOLD</p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight">잠시만 기다려 주세요.</h1>
                  <p className="mt-3 text-[var(--pm-muted)]">MC가 다음 장면을 준비하고 있어요.</p>
                </div>
              </div>
            ) : interaction ? (
              <div className="flex flex-1 flex-col">
                <div className="bg-[var(--pm-violet,#7c5cff)] p-6 text-[var(--pm-ink,#0b0b14)]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-black tracking-[0.16em]">{interaction.mode.toUpperCase()}</span>
                    <span className="rounded-full border border-black/25 px-3 py-1 text-xs font-black">{interaction.totalResponses} ANSWERS</span>
                  </div>
                  <h1 className="mt-10 text-[clamp(1.9rem,9vw,3.25rem)] font-black leading-[1.05] tracking-[-0.045em]">
                    {interaction.prompt}
                  </h1>
                </div>
                <div className="grid flex-1 content-start gap-3 p-5 sm:p-7">
                  {interaction.phase === "open" ? (
                    <>
                      {interaction.options.map((option) => {
                        const selected = interaction.answeredOptionId === option.id;
                        return (
                          <button
                            className={`flex min-h-16 items-center justify-between rounded-[var(--pm-radius-lg)] border px-5 text-left text-lg font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-lime,#d7ff3f)] disabled:cursor-wait ${
                              selected
                                ? "border-[var(--pm-lime,#d7ff3f)] bg-[var(--pm-lime,#d7ff3f)] text-[var(--pm-ink,#0b0b14)]"
                                : "border-[var(--pm-border-strong)] bg-[var(--pm-surface-raised)] text-[var(--pm-ivory)] hover:border-[var(--pm-border-strong)] hover:bg-[var(--pm-surface-soft)]"
                            }`}
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            disabled={Boolean(pending)}
                            data-testid={`answer-${option.id}`}
                            onClick={() => void answer(option.id)}
                          >
                            {option.label}
                            {selected ? <Check aria-hidden="true" size={22} strokeWidth={3} /> : <CircleDot aria-hidden="true" size={20} className="opacity-35" />}
                          </button>
                        );
                      })}
                      {interaction.answeredOptionId ? (
                        <p className="pt-2 text-center text-sm font-bold text-[var(--pm-lime,#d7ff3f)]" role="status">
                          전송됐어요. 이제 메인 화면을 봐주세요.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="grid gap-6 py-2">
                      <div className="flex items-center gap-3 rounded-[var(--pm-radius-md)] bg-[var(--pm-surface-raised)] p-4">
                        {interaction.phase === "revealed" ? <PartyPopper aria-hidden="true" className="text-[var(--pm-coral,#ff5d73)]" /> : <LockKeyhole aria-hidden="true" className="text-[var(--pm-cyan,#45d7ff)]" />}
                        <div>
                          <p className="font-black">{interaction.phase === "revealed" ? "결과가 공개됐어요" : "투표가 마감됐어요"}</p>
                          <p className="text-sm text-[var(--pm-muted)]">{interaction.answeredOptionId ? "내 선택도 반영됐습니다." : "다음 질문을 기다려 주세요."}</p>
                        </div>
                      </div>
                      {interaction.results ? (
                        <ResultBars
                          results={interaction.results}
                          correctOptionId={interaction.correctOptionId}
                          showCorrect={interaction.phase === "revealed"}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : mission ? (
              <div className="flex flex-1 flex-col">
                <div className="bg-[var(--pm-coral,#ff5d73)] p-6 text-[var(--pm-ink,#0b0b14)]">
                  <Sparkles aria-hidden="true" size={30} strokeWidth={2.5} />
                  <p className="mt-8 text-xs font-black tracking-[0.18em]">MISSION UNLOCKED</p>
                  <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">{mission.title}</h1>
                </div>
                <div className="flex flex-1 flex-col justify-between gap-8 p-6 sm:p-8">
                  <div>
                    <p className="text-2xl font-black leading-snug">{mission.description}</p>
                    <p className="mt-4 text-sm text-[var(--pm-muted)]">휴대폰보다 사람을 봐주세요. 완료 확인은 한 번이면 충분해요.</p>
                  </div>
                  <button
                    className="flex min-h-14 items-center justify-center gap-2 rounded-[var(--pm-radius-md)] bg-[var(--pm-lime,#d7ff3f)] px-5 font-black text-[var(--pm-ink,#0b0b14)] disabled:cursor-default disabled:opacity-60"
                    type="button"
                    disabled={mission.completed || Boolean(pending)}
                    data-testid="complete-mission"
                    onClick={() => void completeMission()}
                  >
                    {mission.completed ? "미션 완료" : `완료하고 +${mission.points} P`}
                    <Check aria-hidden="true" size={20} />
                  </button>
                </div>
              </div>
            ) : view.activeCue?.payload.kind === "leaderboard" ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <Trophy className="mx-auto text-[var(--pm-lime,#d7ff3f)]" aria-hidden="true" size={44} />
                  <p className="mt-6 text-xs font-black tracking-[0.2em] text-[var(--pm-lime,#d7ff3f)]">LOOK AT THE SCREEN</p>
                  <h1 className="mt-3 text-3xl font-black">점수가 공개됩니다.</h1>
                </div>
              </div>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <Sparkles className="mx-auto text-[var(--pm-violet,#7c5cff)]" aria-hidden="true" size={44} />
                  <p className="mt-6 text-xs font-black tracking-[0.2em] text-[var(--pm-violet,#7c5cff)]">
                    {view.activeCue?.payload.kind === "announcement"
                      ? view.activeCue.payload.eyebrow ?? "NOW PLAYING"
                      : "STANDBY"}
                  </p>
                  <h1 className="mt-3 text-3xl font-black leading-tight">
                    {view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom"
                      ? view.activeCue.payload.headline
                      : "다음 미션이 곧 공개됩니다."}
                  </h1>
                  {(view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom") && view.activeCue.payload.body ? (
                    <p className="mt-4 text-[var(--pm-muted)]">{view.activeCue.payload.body}</p>
                  ) : null}
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        <footer className="flex items-center justify-between gap-3 px-1 text-xs text-[var(--pm-muted)]">
          <span className="flex items-center gap-2"><UserRound aria-hidden="true" size={14} /> {view.guest.displayName}</span>
          <span className="font-bold tabular-nums">내 점수 {view.score.guest} · 테이블 {view.score.table ?? 0}</span>
        </footer>

        {commandError || viewError ? (
          <p className="rounded-[var(--pm-radius-md)] bg-[var(--pm-coral,#ff5d73)]/15 p-3 text-sm font-bold text-[var(--pm-coral,#ff5d73)]" role="alert">
            {commandError ?? viewError}
          </p>
        ) : null}
      </div>
    </main>
  );
}
