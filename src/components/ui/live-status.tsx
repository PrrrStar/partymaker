import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type LiveStatusState = "live" | "paused" | "offline" | "ready";

export type LiveStatusProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
  status?: LiveStatusState;
};

const defaultLabels: Record<LiveStatusState, string> = {
  live: "Live",
  paused: "Paused",
  offline: "Offline",
  ready: "Ready",
};

export function LiveStatus({
  className,
  label,
  status = "live",
  ...props
}: LiveStatusProps) {
  return (
    <span
      aria-live="polite"
      className={cx("pm-live-status", `pm-live-status--${status}`, className)}
      role="status"
      {...props}
    >
      <span className="pm-live-status__dot" aria-hidden="true" />
      <span>{label ?? defaultLabels[status]}</span>
    </span>
  );
}
