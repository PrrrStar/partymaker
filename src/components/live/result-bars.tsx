import { Check } from "lucide-react";

import type { InteractionOptionResult } from "@/domain";

export function ResultBars({
  results,
  correctOptionId,
  showCorrect = false,
  size = "default",
}: {
  results: InteractionOptionResult[];
  correctOptionId?: string;
  showCorrect?: boolean;
  size?: "compact" | "default" | "screen";
}) {
  const labelSize =
    size === "screen"
      ? "text-[clamp(1.25rem,2.4vw,2.5rem)]"
      : size === "compact"
        ? "text-sm"
        : "text-base";
  const barHeight = size === "screen" ? "h-5 sm:h-7" : "h-3";

  return (
    <div className="grid gap-4" aria-label="투표 결과">
      {results.map((result) => {
        const isCorrect = showCorrect && result.optionId === correctOptionId;

        return (
          <div className="grid gap-2" key={result.optionId}>
            <div className={`flex items-end justify-between gap-4 ${labelSize}`}>
              <span className="flex min-w-0 items-center gap-2 font-bold">
                {isCorrect ? (
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--pm-lime,#d7ff3f)] text-[var(--pm-ink,#0b0b14)]"
                    aria-label="정답"
                  >
                    <Check aria-hidden="true" size={15} strokeWidth={3} />
                  </span>
                ) : null}
                <span className="truncate">{result.label}</span>
              </span>
              <span className="shrink-0 font-black tabular-nums">
                {result.percentage}%
              </span>
            </div>
            <div
              className={`${barHeight} overflow-hidden rounded-full bg-white/10`}
              role="meter"
              aria-valuenow={result.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${result.label} ${result.percentage}%`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                  isCorrect
                    ? "bg-[var(--pm-lime,#d7ff3f)]"
                    : "bg-[var(--pm-violet,#7c5cff)]"
                }`}
                style={{ width: `${Math.max(0, Math.min(100, result.percentage))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
