import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  compact?: boolean;
  showSignal?: boolean;
};

export function BrandMark({
  className,
  compact = false,
  showSignal = true,
  ...props
}: BrandMarkProps) {
  return (
    <span
      className={cx("pm-brand", compact && "pm-brand--compact", className)}
      {...props}
    >
      <span>PARTY</span>
      <span className="pm-brand__slash" aria-hidden="true">
        /
      </span>
      <span>MAKER</span>
      {showSignal ? <span className="pm-brand__signal" aria-hidden="true" /> : null}
    </span>
  );
}
