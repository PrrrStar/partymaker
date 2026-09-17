"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BarChart3,
  Check,
  LockKeyhole,
  PartyPopper,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useMemo } from "react";

import { ResultBars } from "@/components/live/result-bars";
import { useLiveEventView } from "@/client/use-live-event-view";
import type { ScreenView } from "@/domain";
import { JoinQr } from "@/features/screen/join-qr";

const EVENT_ID = "demo";

const PartySceneCanvas = dynamic(
  () => import("@/components/scene/party-scene").then((module) => module.PartySceneCanvas),
  { ssr: false },
);

function Leaderboard({ view }: { view: ScreenView }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-[clamp(1rem,2vh,2rem)]">
      {view.leaderboard.map((table) => (
        <div
          className="grid grid-cols-[clamp(3rem,6vw,6rem)_1fr_auto] items-center gap-[clamp(1rem,2vw,2rem)] rounded-[clamp(.6rem,1vw,1rem)] border border-white/10 bg-white/[0.055] px-[clamp(1rem,3vw,3rem)] py-[clamp(.8rem,1.8vh,1.6rem)]"
          key={table.id}
        >
          <span className="text-[clamp(1.4rem,3vw,3rem)] font-black text-white/35 tabular-nums">
            {String(table.rank).padStart(2, "0")}
          </span>
          <span className="flex items-center gap-4 text-[clamp(1.5rem,3.2vw,3.5rem)] font-black">
            <span className="size-[clamp(.75rem,1.4vw,1.5rem)] rounded-full" style={{ backgroundColor: table.color }} />
            {table.name}
          </span>
          <span className="text-[clamp(1.6rem,3.6vw,4rem)] font-black tabular-nums">
            {table.score}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ScreenApp() {
  const shouldReduceMotion = useReducedMotion();
  const { view, error, connection } = useLiveEventView<ScreenView>({
    eventId: EVENT_ID,
    surface: "screen",
  });

  const interaction =
    view?.activeCue?.payload.kind === "interaction"
      ? view.activeCue.payload.interaction
      : null;
  const mission =
    view?.activeCue?.payload.kind === "mission"
      ? view.activeCue.payload.mission
      : null;
  const cueKind = view?.activeCue?.payload.kind ?? "standby";

  const sceneKey = useMemo(() => {
    if (!view) return "loading";
    if (view.paused) return "paused";
    if (view.screenOverride) return `override:${view.screenOverride.kind}`;
    if (interaction) return `interaction:${interaction.id}:${interaction.phase}`;
    if (mission) return `mission:${mission.id}`;
    return view.activeCue?.id ?? view.activeStage?.id ?? "standby";
  }, [interaction, mission, view]);

  if (!view) {
    return (
      <main className="grid h-dvh overflow-hidden bg-[var(--pm-ink,#0b0b14)] p-[5vmin] text-[var(--pm-ivory,#f7f3e8)]">
        <div className="m-auto text-center" role="status">
          <Sparkles className="mx-auto text-[var(--pm-wedding-champagne,#f2d492)]" size={64} />
          <p className="mt-6 text-2xl font-black tracking-[0.12em]">SCREEN STANDBY</p>
          {error ? <p className="mt-3 text-lg text-[var(--pm-wedding-blush,#e7a6a1)]">{error}</p> : null}
        </div>
      </main>
    );
  }

  const override = view.screenOverride;
  const showLeaderboard =
    override?.kind === "leaderboard" ||
    (!override && view.activeCue?.payload.kind === "leaderboard");
  const showJoinQr =
    !override &&
    view.activeStage?.id === "stage-check-in" &&
    view.activeCue?.payload.kind === "announcement";

  return (
    <main
      className="relative grid h-dvh overflow-hidden bg-[var(--pm-ink,#0b0b14)] p-[clamp(2rem,5vmin,6rem)] text-[var(--pm-ivory,#f7f3e8)]"
      data-testid="screen-root"
    >
      <PartySceneCanvas
        className="pm-screen-scene"
        stageId={view.activeStage?.id}
        cueKind={cueKind}
        interactionPhase={interaction?.phase}
        participantCount={view.participantCount}
        reducedMotion={Boolean(shouldReduceMotion)}
      />
      <div className="pm-screen-vignette" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-[10vw] -top-[30vh] h-[70vh] w-[38vw] rotate-12 bg-[var(--pm-wedding-lavender,#b9adeb)] opacity-[0.12]" />
        <div className="absolute -bottom-[35vh] -left-[8vw] h-[65vh] w-[30vw] -rotate-12 bg-[var(--pm-wedding-blush,#e7a6a1)] opacity-[0.1]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <header className="relative z-10 flex items-start justify-between gap-8">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-[var(--pm-radius-md)] bg-[var(--pm-wedding-champagne,#f2d492)] px-4 py-2 text-[clamp(.7rem,1vw,1rem)] font-black tracking-[0.15em] text-[var(--pm-ink,#0b0b14)]">
            <span className="size-2.5 rounded-full bg-current" /> LIVE
          </span>
          <div>
            <p className="text-[clamp(.65rem,.9vw,.95rem)] font-black tracking-[0.2em] text-white/35">ROOM SIGNAL / CURRENT STAGE</p>
            <p className="mt-1 text-[clamp(1rem,1.5vw,1.6rem)] font-black" data-testid="screen-stage">
              {view.activeStage?.title ?? "STANDBY"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[clamp(.75rem,1vw,1rem)] font-bold text-white/55">
          <span className="pm-screen-engine">
            <Sparkles aria-hidden="true" size={17} />
            ATMOSPHERE ENGINE
            <b>v{view.version}</b>
          </span>
          <span className="flex items-center gap-2">
            <UsersRound aria-hidden="true" size={22} />
            <span className="tabular-nums">{view.participantCount} PLAYERS</span>
          </span>
          <span className={`size-2.5 rounded-full ${connection === "live" ? "bg-[var(--pm-wedding-sage,#a8c3a0)]" : "bg-[var(--pm-wedding-blush,#e7a6a1)]"}`} aria-label={connection === "live" ? "연결됨" : "재연결 중"} />
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          className="relative z-10 grid min-h-0 content-center py-[3vh]"
          key={sceneKey}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(28px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-18px)" }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.34, ease: "easeOut" }}
          data-testid="screen-scene"
        >
          {view.paused ? (
            <div className="mx-auto max-w-5xl text-center">
              <LockKeyhole className="mx-auto text-[var(--pm-wedding-moonlight,#b8d8e8)]" size={80} strokeWidth={1.7} />
              <p className="mt-10 text-[clamp(1rem,1.5vw,1.5rem)] font-black tracking-[0.22em] text-[var(--pm-wedding-moonlight,#b8d8e8)]">HOLD THE ROOM</p>
              <h1 className="mt-5 text-[clamp(3rem,7vw,8rem)] font-black leading-[0.98] tracking-[-0.055em]">잠시만<br />기다려 주세요.</h1>
            </div>
          ) : override?.kind === "blank" ? (
            <div aria-label="빈 화면" />
          ) : override?.kind === "custom" ? (
            <div className="mx-auto max-w-6xl text-center">
              <p className="text-[clamp(1rem,1.7vw,1.8rem)] font-black tracking-[0.2em] text-[var(--pm-wedding-blush,#e7a6a1)]">{override.eyebrow ?? "SPECIAL CUE"}</p>
              <h1 className="mt-6 text-[clamp(3rem,8vw,9rem)] font-black leading-[0.94] tracking-[-0.06em]">{override.headline}</h1>
              {override.body ? <p className="mx-auto mt-8 max-w-4xl text-[clamp(1.4rem,2.5vw,2.8rem)] leading-snug text-white/65">{override.body}</p> : null}
            </div>
          ) : showLeaderboard ? (
            <div className="grid gap-[clamp(1.5rem,4vh,4rem)]">
              <div className="text-center">
                <Trophy className="mx-auto text-[var(--pm-wedding-champagne,#f2d492)]" size={64} strokeWidth={1.8} />
                <p className="mt-4 text-[clamp(.9rem,1.3vw,1.4rem)] font-black tracking-[0.22em] text-[var(--pm-wedding-champagne,#f2d492)]">LIVE RANKING</p>
                <h1 className="mt-2 text-[clamp(2.8rem,6vw,7rem)] font-black tracking-[-0.055em]">
                  {override?.kind === "leaderboard" ? override.headline ?? "TABLE BATTLE" : view.activeCue?.payload.kind === "leaderboard" ? view.activeCue.payload.headline : "TABLE BATTLE"}
                </h1>
              </div>
              <Leaderboard view={view} />
            </div>
          ) : interaction ? (
            <div className="mx-auto grid w-full max-w-7xl gap-[clamp(2rem,5vh,5rem)]">
              <div className="text-center">
                <div className="mx-auto flex w-fit items-center gap-3 rounded-[var(--pm-radius-md)] border border-white/15 bg-white/[0.05] px-5 py-2 text-[clamp(.7rem,1vw,1rem)] font-black tracking-[0.16em]">
                  {interaction.phase === "open" ? <BarChart3 aria-hidden="true" size={20} /> : interaction.phase === "revealed" ? <PartyPopper aria-hidden="true" size={20} /> : <LockKeyhole aria-hidden="true" size={20} />}
                  {interaction.phase === "open" ? "VOTING OPEN" : interaction.phase === "closed" ? "VOTING CLOSED" : "RESULT REVEAL"}
                </div>
                <h1 className="mx-auto mt-[clamp(1.5rem,3vh,3rem)] max-w-6xl text-[clamp(2.7rem,6.7vw,8rem)] font-black leading-[0.98] tracking-[-0.06em]">
                  {interaction.prompt}
                </h1>
              </div>

              {interaction.phase === "open" ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {interaction.options.map((option, index) => (
                    <div className="flex min-h-[clamp(6rem,14vh,10rem)] items-center justify-between rounded-[clamp(.6rem,1vw,1rem)] border border-white/15 bg-white/[0.055] px-[clamp(1.5rem,3vw,3rem)]" key={option.id}>
                      <span className="text-[clamp(.9rem,1.3vw,1.3rem)] font-black text-white/35">0{index + 1}</span>
                      <span className="text-[clamp(1.8rem,4vw,4.5rem)] font-black">{option.label}</span>
                    </div>
                  ))}
                  <p className="col-span-full text-center text-[clamp(1rem,1.6vw,1.6rem)] font-bold text-white/45">
                    휴대폰에서 선택해 주세요 · {interaction.totalResponses}명 응답
                  </p>
                </div>
              ) : interaction.results ? (
                <div className="mx-auto w-full max-w-6xl rounded-[clamp(.75rem,1.2vw,1.25rem)] border border-white/10 bg-white/[0.045] p-[clamp(1.5rem,3vw,3.5rem)]" data-testid="screen-results">
                  <ResultBars
                    results={interaction.results}
                    correctOptionId={interaction.correctOptionId}
                    showCorrect={interaction.phase === "revealed"}
                    size="screen"
                  />
                  <p className="mt-[clamp(1rem,2vh,2rem)] text-center text-[clamp(.9rem,1.3vw,1.3rem)] font-bold text-white/40">
                    {interaction.phase === "closed"
                      ? `투표 마감 · 총 ${interaction.totalResponses}명 참여 · 정답 공개 대기`
                      : `총 ${interaction.totalResponses}명 참여`}
                  </p>
                </div>
              ) : null}
            </div>
          ) : mission ? (
            <div className="mx-auto grid max-w-6xl justify-items-center text-center">
              <div className="grid size-[clamp(5rem,10vw,9rem)] place-items-center rounded-full bg-[var(--pm-wedding-blush,#e7a6a1)] text-[var(--pm-ink,#0b0b14)]">
                <Sparkles size={64} strokeWidth={2.2} />
              </div>
              <p className="mt-[clamp(1.5rem,3vh,3rem)] text-[clamp(1rem,1.5vw,1.5rem)] font-black tracking-[0.23em] text-[var(--pm-wedding-blush,#e7a6a1)]">MISSION UNLOCKED</p>
              <h1 className="mt-4 text-[clamp(3rem,8vw,9rem)] font-black leading-[0.94] tracking-[-0.06em]">{mission.title}</h1>
              <p className="mt-[clamp(1.5rem,3vh,3rem)] max-w-5xl text-[clamp(1.7rem,3.5vw,4rem)] font-bold leading-tight">{mission.description}</p>
            </div>
          ) : override?.kind === "welcome" || view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom" ? (
            <div
              className={`mx-auto w-full max-w-7xl items-center gap-[clamp(2rem,6vw,7rem)] ${
                showJoinQr
                  ? "grid grid-cols-[minmax(0,1fr)_auto] text-left"
                  : "text-center"
              }`}
            >
              <div>
                <p className="text-[clamp(1rem,1.7vw,1.8rem)] font-black tracking-[0.23em] text-[var(--pm-wedding-lavender,#b9adeb)]">
                  {view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom" ? view.activeCue.payload.eyebrow ?? "PARTYMAKER" : "WELCOME TO"}
                </p>
                <h1 className={`mt-6 font-black leading-[0.88] tracking-[-0.07em] ${showJoinQr ? "text-[clamp(3.5rem,7vw,8rem)]" : "text-[clamp(3.5rem,9.5vw,11rem)]"}`}>
                  {view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom" ? view.activeCue.payload.headline : view.event.title}
                </h1>
                {(view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom") && view.activeCue.payload.body ? (
                  <p className={`${showJoinQr ? "mt-8 max-w-4xl" : "mx-auto mt-10 max-w-5xl"} text-[clamp(1.5rem,2.8vw,3.2rem)] font-bold leading-snug text-white/55`}>{view.activeCue.payload.body}</p>
                ) : null}
              </div>
              {showJoinQr ? <JoinQr /> : null}
            </div>
          ) : (
            <div className="mx-auto text-center">
              <Sparkles className="mx-auto text-[var(--pm-wedding-lavender,#b9adeb)]" size={72} />
              <p className="mt-8 text-2xl font-black tracking-[0.2em]">NEXT CUE SOON</p>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      <footer className="relative z-10 flex items-end justify-between gap-8 text-[clamp(.7rem,.95vw,1rem)] font-bold text-white/30">
        <span>SCENE ENGINE ACTIVE · THE PHONE IS THE CONTROLLER.</span>
        {error ? <span className="text-[var(--pm-wedding-blush,#e7a6a1)]">연결 복구 중</span> : <span className="flex items-center gap-2"><Check aria-hidden="true" size={16} /> SYNCHRONIZED</span>}
      </footer>
    </main>
  );
}
