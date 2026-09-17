import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type StageBadgeTone = "neutral" | "lime" | "coral" | "violet" | "cyan";

export type StageBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  children: ReactNode;
  eyebrow?: string;
  tone?: StageBadgeTone;
};

export function StageBadge({
  children,
  className,
  eyebrow,
  tone = "neutral",
  ...props
}: StageBadgeProps) {
  return (
    <span
      className={cx("pm-stage-badge", `pm-stage-badge--${tone}`, className)}
      {...props}
    >
      {eyebrow ? <span className="pm-stage-badge__eyebrow">{eyebrow}</span> : null}
      <span>{children}</span>
    </span>
  );
}
