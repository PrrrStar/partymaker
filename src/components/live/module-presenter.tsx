"use client";

import { Clock3, Gamepad2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MODULE_CATALOG, type EventModule, type TableStanding } from "@/domain";

function useRemaining(module: EventModule | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (module?.timer?.status !== "running") return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [module?.timer?.status]);

  if (!module?.timer) return 0;
  if (module.timer.status !== "running" || !module.timer.endsAt) {
    return module.timer.remainingMs;
  }
  return Math.max(0, Date.parse(module.timer.endsAt) - now);
}

function timerLabel(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1_000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function ModuleOverlays({
  modules,
  leaderboard,
  surface,
}: {
  modules: EventModule[];
  leaderboard: TableStanding[];
  surface: "admin" | "guest" | "screen";
}) {
  const timer = modules.find((module) => module.definitionId === "timer");
  const score = modules.find((module) => module.definitionId === "team-score");
  const remaining = useRemaining(timer);
  const urgent = Boolean(timer?.timer?.status === "running" && remaining <= 10_000);

  if (!timer && !score) return null;

  return (
    <aside
      className={
        surface === "screen"
          ? "pointer-events-none absolute right-[clamp(2rem,5vmin,6rem)] top-[clamp(7rem,14vh,10rem)] z-20 grid w-[min(28rem,28vw)] gap-3"
          : "grid gap-3"
      }
      aria-label="진행 도구"
    >
      {timer ? (
        <div
          className={`${surface === "screen" ? "p-[clamp(1rem,2vw,2rem)]" : "p-4"} rounded-[var(--pm-radius-lg)] border bg-[var(--pm-brand-black)] text-white shadow-[var(--pm-shadow-card)] ${urgent ? "border-[var(--pm-brand-orange)]" : "border-white/20"}`}
        >
          <p className="flex items-center gap-2 text-xs font-black tracking-[0.1em] text-[var(--pm-brand-orange)]">
            <Clock3 aria-hidden="true" size={surface === "screen" ? 22 : 16} /> 남은 시간
          </p>
          <p className={`${surface === "screen" ? "mt-2 text-[clamp(2.5rem,5vw,5rem)]" : "mt-1 text-3xl"} font-mono font-black tabular-nums`} aria-live="polite">
            {timerLabel(remaining)}
          </p>
          {remaining === 0 ? <p className="mt-1 text-sm font-bold text-[var(--pm-brand-orange)]">시간이 끝났습니다.</p> : null}
        </div>
      ) : null}

      {score ? (
        <div className={`${surface === "screen" ? "p-[clamp(1rem,1.5vw,1.5rem)]" : "p-4"} rounded-[var(--pm-radius-lg)] border border-white/20 bg-[var(--pm-brand-black)] text-white shadow-[var(--pm-shadow-card)]`}>
          <p className="flex items-center gap-2 text-xs font-black tracking-[0.1em] text-[var(--pm-brand-orange)]">
            <Trophy aria-hidden="true" size={surface === "screen" ? 22 : 16} /> 팀별 점수
          </p>
          <ol className="mt-3 grid gap-2">
            {leaderboard.slice(0, score.config.kind === "team-score" ? score.config.maxTeams : 8).map((table) => (
              <li className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 text-sm" key={table.id}>
                <span className="text-center font-black text-white/60">{table.rank}</span>
                <span className="truncate font-bold">{table.name}</span>
                <span className="font-black tabular-nums">{table.score}점</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}

export function PrimaryModulePanel({
  module,
  surface,
}: {
  module: EventModule;
  surface: "guest" | "screen";
}) {
  const definition = useMemo(
    () => MODULE_CATALOG.find((item) => item.id === module.definitionId),
    [module.definitionId],
  );
  return (
    <div className={`mx-auto grid max-w-5xl justify-items-center text-center ${surface === "screen" ? "gap-6" : "gap-3 p-7"}`}>
      <span className="grid size-14 place-items-center rounded-full bg-[var(--pm-brand-orange)] text-[var(--pm-brand-black)]">
        <Gamepad2 aria-hidden="true" size={28} />
      </span>
      <p className="text-xs font-black tracking-[0.12em] text-[var(--pm-brand-orange)]">게임 모듈</p>
      <h1 className={surface === "screen" ? "text-[clamp(3rem,7vw,8rem)] font-black leading-none" : "text-3xl font-black"}>{module.title}</h1>
      <p className={surface === "screen" ? "max-w-4xl text-[clamp(1.3rem,2.3vw,2.5rem)] text-white/70" : "text-sm leading-relaxed text-[var(--pm-muted)]"}>
        {definition?.description}
      </p>
      <p className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/60">
        {module.phase === "live" ? "진행 중" : module.phase === "paused" ? "일시 정지" : module.phase === "closed" ? "종료" : "준비 완료"}
      </p>
    </div>
  );
}
