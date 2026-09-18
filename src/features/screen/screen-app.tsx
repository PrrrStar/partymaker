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
import { useEffect, useMemo, useState } from "react";

import { ResultBars } from "@/components/live/result-bars";
import { ModuleOverlays, PrimaryModulePanel } from "@/components/live/module-presenter";
import { useLiveEventView } from "@/client/use-live-event-view";
import { useLobbyRoom } from "@/client/use-lobby-room";
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
          <span className="text-[clamp(1.4rem,3vw,3rem)] font-black text-white/60 tabular-nums">
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
  const lobby = useLobbyRoom({ eventId: EVENT_ID, role: "screen" });
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    let timeout: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      timeout = window.setTimeout(() => setSceneReady(true), 120);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, []);

  const interaction =
    view?.activeCue?.payload.kind === "interaction"
      ? view.activeCue.payload.interaction
      : null;
  const mission =
    view?.activeCue?.payload.kind === "mission"
      ? view.activeCue.payload.mission
      : null;
  const primaryModule = view?.activeModules.find((module) => module.slot === "primary") ?? null;
  const cueKind = view?.activeCue?.payload.kind ?? "standby";

  const sceneKey = useMemo(() => {
    if (!view) return "loading";
    if (view.paused) return "paused";
    if (view.screenOverride) return `override:${view.screenOverride.kind}`;
    if (primaryModule) return `module:${primaryModule.id}:${primaryModule.phase}`;
    if (interaction) return `interaction:${interaction.id}:${interaction.phase}`;
    if (mission) return `mission:${mission.id}`;
    return view.activeCue?.id ?? view.activeStage?.id ?? "standby";
  }, [interaction, mission, primaryModule, view]);

  if (!view) {
    return (
      <main className="grid h-dvh overflow-hidden bg-[var(--pm-ink,#050505)] p-[5vmin] text-[var(--pm-ivory,#ffffff)]">
        <div className="m-auto text-center" role="status">
          <Sparkles className="mx-auto text-[var(--pm-brand-orange,#f54b1e)]" size={64} />
          <p className="mt-6 text-2xl font-black tracking-[0.1em]">메인 화면 준비 중…</p>
          {error ? <p className="mt-3 text-lg text-[var(--pm-brand-orange,#f54b1e)]">{error}</p> : null}
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
  const readyLobbyCount = lobby.avatars.filter((avatar) => avatar.ready).length;

  return (
    <main
      className="pm-screen-shell relative grid h-dvh overflow-hidden bg-[var(--pm-ink,#050505)] p-[clamp(2rem,5vmin,6rem)] text-[var(--pm-ivory,#ffffff)]"
      data-testid="screen-root"
    >
      <div className="pm-screen-scene pm-scene-fallback" aria-hidden="true" />
      {sceneReady ? (
        <PartySceneCanvas
          className="pm-screen-scene"
          stageId={view.activeStage?.id}
          cueKind={cueKind}
          interactionPhase={interaction?.phase}
          participantCount={view.participantCount}
          lobbyAvatars={view.activeStage?.id === "stage-check-in" ? lobby.avatars : []}
          reducedMotion={Boolean(shouldReduceMotion)}
        />
      ) : null}
      <div className="pm-screen-vignette" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-[10vw] -top-[30vh] h-[70vh] w-[38vw] rotate-12 bg-[var(--pm-brand-orange,#f54b1e)] opacity-[0.12]" />
        <div className="absolute -bottom-[35vh] -left-[8vw] h-[65vh] w-[30vw] -rotate-12 bg-[var(--pm-brand-orange,#f54b1e)] opacity-[0.1]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <header className="relative z-10 flex items-start justify-between gap-8">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-[var(--pm-radius-md)] bg-[var(--pm-brand-orange,#f54b1e)] px-4 py-2 text-[clamp(.75rem,1vw,1rem)] font-black tracking-[0.12em] text-[var(--pm-ink,#050505)]">
            <span className="size-2.5 rounded-full bg-current" /> 실시간
          </span>
          <div>
            <p className="text-[clamp(.75rem,.9vw,.95rem)] font-black tracking-[0.14em] text-white/60">현재 진행 단계</p>
            <p className="mt-1 text-[clamp(1rem,1.5vw,1.6rem)] font-black" data-testid="screen-stage">
              {view.activeStage?.title ?? "준비 중"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[clamp(.75rem,1vw,1rem)] font-bold text-white/70">
          <span className="pm-screen-engine">
            <Sparkles aria-hidden="true" size={17} />
            장면 연출
            <b>v{view.version}</b>
          </span>
          <span className="flex items-center gap-2">
            <UsersRound aria-hidden="true" size={22} />
            <span className="tabular-nums">참여 {view.participantCount}명</span>
          </span>
          {view.activeStage?.id === "stage-check-in" ? (
            <span className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold">
              3D 대기방 {lobby.status === "live" ? "연결됨" : "연결 중…"}
            </span>
          ) : null}
          <span className={`size-2.5 rounded-full ${connection === "live" ? "bg-[var(--pm-brand-orange,#f54b1e)]" : "bg-white/40"}`} aria-label={connection === "live" ? "연결됨" : "재연결 중"} />
        </div>
      </header>

      <ModuleOverlays modules={view.activeModules} leaderboard={view.leaderboard} surface="screen" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          className={`relative z-10 grid min-h-0 content-center py-[3vh] ${view.activeModules.some((instance) => instance.slot === "overlay") ? "pr-[clamp(14rem,29vw,30rem)]" : ""}`}
          key={sceneKey}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(28px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-18px)" }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.34, ease: "easeOut" }}
          data-testid="screen-scene"
        >
          {view.paused ? (
            <div className="mx-auto max-w-5xl text-center">
              <LockKeyhole className="mx-auto text-[var(--pm-brand-white,#ffffff)]" size={80} strokeWidth={1.7} />
              <p className="mt-10 text-[clamp(1rem,1.5vw,1.5rem)] font-black tracking-[0.14em] text-[var(--pm-brand-white,#ffffff)]">잠시 대기</p>
              <h1 className="mt-5 text-[clamp(3rem,7vw,8rem)] font-black leading-[0.98] tracking-[-0.055em]">잠시만<br />기다려 주세요.</h1>
            </div>
          ) : override?.kind === "blank" ? (
            <div aria-label="빈 화면" />
          ) : override?.kind === "custom" ? (
            <div className="mx-auto max-w-6xl text-center">
              <p className="text-[clamp(1rem,1.7vw,1.8rem)] font-black tracking-[0.2em] text-[var(--pm-brand-orange,#f54b1e)]">{override.eyebrow ?? "SPECIAL CUE"}</p>
              <h1 className="mt-6 text-[clamp(3rem,8vw,9rem)] font-black leading-[0.94] tracking-[-0.06em]">{override.headline}</h1>
              {override.body ? <p className="mx-auto mt-8 max-w-4xl text-[clamp(1.4rem,2.5vw,2.8rem)] leading-snug text-white/65">{override.body}</p> : null}
            </div>
          ) : primaryModule ? (
            <PrimaryModulePanel module={primaryModule} surface="screen" />
          ) : showLeaderboard ? (
            <div className="grid gap-[clamp(1.5rem,4vh,4rem)]">
              <div className="text-center">
                <Trophy className="mx-auto text-[var(--pm-brand-orange,#f54b1e)]" size={64} strokeWidth={1.8} />
                <p className="mt-4 text-[clamp(.9rem,1.3vw,1.4rem)] font-black tracking-[0.14em] text-[var(--pm-brand-orange,#f54b1e)]">실시간 순위</p>
                <h1 className="mt-2 text-[clamp(2.8rem,6vw,7rem)] font-black tracking-[-0.055em]">
                  {override?.kind === "leaderboard" ? override.headline ?? "TABLE BATTLE" : view.activeCue?.payload.kind === "leaderboard" ? view.activeCue.payload.headline : "TABLE BATTLE"}
                </h1>
              </div>
              <Leaderboard view={view} />
            </div>
          ) : interaction ? (
            <div className="mx-auto grid w-full max-w-7xl gap-[clamp(2rem,5vh,5rem)]">
              <div className="text-center">
                <div className="mx-auto flex w-fit items-center gap-3 rounded-[var(--pm-radius-md)] border border-white/15 bg-white/[0.05] px-5 py-2 text-[clamp(.75rem,1vw,1rem)] font-black tracking-[0.12em]">
                  {interaction.phase === "open" ? <BarChart3 aria-hidden="true" size={20} /> : interaction.phase === "revealed" ? <PartyPopper aria-hidden="true" size={20} /> : <LockKeyhole aria-hidden="true" size={20} />}
                  {interaction.phase === "open" ? "투표 진행 중" : interaction.phase === "closed" ? "투표 마감" : "결과 공개"}
                </div>
                <h1 className="mx-auto mt-[clamp(1.5rem,3vh,3rem)] max-w-6xl text-[clamp(2.7rem,6.7vw,8rem)] font-black leading-[0.98] tracking-[-0.06em]">
                  {interaction.prompt}
                </h1>
              </div>

              {interaction.phase === "open" ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {interaction.options.map((option, index) => (
                    <div className="flex min-h-[clamp(6rem,14vh,10rem)] items-center justify-between rounded-[clamp(.6rem,1vw,1rem)] border border-white/15 bg-white/[0.055] px-[clamp(1.5rem,3vw,3rem)]" key={option.id}>
                      <span className="text-[clamp(.9rem,1.3vw,1.3rem)] font-black text-white/60">0{index + 1}</span>
                      <span className="text-[clamp(1.8rem,4vw,4.5rem)] font-black">{option.label}</span>
                    </div>
                  ))}
                  <p className="col-span-full text-center text-[clamp(1rem,1.6vw,1.6rem)] font-bold text-white/45">
                    휴대폰에서 선택해 주세요 · {interaction.totalResponses}명 응답
                  </p>
                </div>
              ) : interaction.phase === "closed" ? (
                <div className="mx-auto grid w-full max-w-4xl justify-items-center gap-5 rounded-[clamp(.75rem,1.2vw,1.25rem)] border border-white/15 bg-black/35 p-[clamp(2rem,5vw,5rem)] text-center">
                  <LockKeyhole
                    aria-hidden="true"
                    className="text-[var(--pm-brand-orange,#f54b1e)]"
                    size={64}
                    strokeWidth={1.8}
                  />
                  <p className="text-[clamp(.75rem,1.1vw,1.1rem)] font-black tracking-[0.14em] text-[var(--pm-brand-orange,#f54b1e)]">
                    결과 공개 대기
                  </p>
                  <h2 className="text-[clamp(2rem,4vw,4.5rem)] font-black tracking-[-0.04em]">
                    투표가 마감됐습니다.
                  </h2>
                  <p className="text-[clamp(1rem,1.5vw,1.5rem)] font-bold text-white/55">
                    총 {interaction.totalResponses}명 참여 · MC의 결과 공개를 기다려 주세요.
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
                  <p className="mt-[clamp(1rem,2vh,2rem)] text-center text-[clamp(.9rem,1.3vw,1.3rem)] font-bold text-white/65">
                    총 {interaction.totalResponses}명 참여 · 결과 공개 완료
                  </p>
                </div>
              ) : null}
            </div>
          ) : mission ? (
            <div className="mx-auto grid max-w-6xl justify-items-center text-center">
              <div className="grid size-[clamp(5rem,10vw,9rem)] place-items-center rounded-full bg-[var(--pm-brand-orange,#f54b1e)] text-[var(--pm-ink,#050505)]">
                <Sparkles size={64} strokeWidth={2.2} />
              </div>
              <p className="mt-[clamp(1.5rem,3vh,3rem)] text-[clamp(1rem,1.5vw,1.5rem)] font-black tracking-[0.14em] text-[var(--pm-brand-orange,#f54b1e)]">미션 공개</p>
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
                <p className="text-[clamp(1rem,1.7vw,1.8rem)] font-black tracking-[0.23em] text-[var(--pm-brand-orange,#f54b1e)]">
                  {view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom" ? view.activeCue.payload.eyebrow ?? "PARTYMAKER" : "WELCOME TO"}
                </p>
                <h1 className={`mt-6 font-black leading-[0.88] tracking-[-0.07em] ${showJoinQr ? "text-[clamp(3.5rem,7vw,8rem)]" : "text-[clamp(3.5rem,9.5vw,11rem)]"}`}>
                  {view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom" ? view.activeCue.payload.headline : view.event.title}
                </h1>
                {(view.activeCue?.payload.kind === "announcement" || view.activeCue?.payload.kind === "custom") && view.activeCue.payload.body ? (
                  <p className={`${showJoinQr ? "mt-8 max-w-4xl" : "mx-auto mt-10 max-w-5xl"} text-[clamp(1.5rem,2.8vw,3.2rem)] font-bold leading-snug text-white/55`}>{view.activeCue.payload.body}</p>
                ) : null}
                {showJoinQr ? (
                  <p className="mt-6 text-[clamp(1rem,1.5vw,1.5rem)] font-black text-[var(--pm-brand-orange)]">
                    3D 대기방 준비 {readyLobbyCount}명 · 휴대폰 조이스틱으로 움직여 보세요
                  </p>
                ) : null}
              </div>
              {showJoinQr ? <JoinQr /> : null}
            </div>
          ) : (
            <div className="mx-auto text-center">
              <Sparkles className="mx-auto text-[var(--pm-brand-orange,#f54b1e)]" size={72} />
              <p className="mt-8 text-2xl font-black tracking-[0.12em]">다음 장면을 준비하고 있습니다.</p>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      <footer className="relative z-10 flex items-end justify-between gap-8 text-[clamp(.75rem,.95vw,1rem)] font-bold text-white/60">
        <span>실시간 장면 연출 중 · 휴대폰으로 참여해 주세요.</span>
        {error ? <span className="text-[var(--pm-brand-orange,#f54b1e)]">연결 복구 중…</span> : <span className="flex items-center gap-2"><Check aria-hidden="true" size={16} /> 동기화 완료</span>}
      </footer>
    </main>
  );
}
