import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type SurfaceCardTone =
  | "default"
  | "soft"
  | "lime"
  | "coral"
  | "violet"
  | "cyan";

export type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  tone?: SurfaceCardTone;
};

export function SurfaceCard({
  className,
  interactive = false,
  tone = "default",
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cx(
        "pm-surface-card",
        `pm-surface-card--${tone}`,
        interactive && "pm-surface-card--interactive",
        className,
      )}
      {...props}
    />
  );
}
