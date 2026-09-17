import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type MetricPillTone = "neutral" | "lime" | "coral" | "violet" | "cyan";

export type MetricPillProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
  label: string;
  tone?: MetricPillTone;
  value: ReactNode;
};

export function MetricPill({
  className,
  icon,
  label,
  tone = "neutral",
  value,
  ...props
}: MetricPillProps) {
  return (
    <span
      className={cx("pm-metric-pill", `pm-metric-pill--${tone}`, className)}
      {...props}
    >
      {icon ? <span className="pm-metric-pill__icon">{icon}</span> : null}
      <span className="pm-metric-pill__value">{value}</span>
      <span className="pm-metric-pill__label">{label}</span>
    </span>
  );
}
