import type { HTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cx } from "./utils";

export type LoadingStateProps = HTMLAttributes<HTMLDivElement> & {
  description?: string;
  label?: string;
  page?: boolean;
};

export function LoadingState({
  className,
  description,
  label = "불러오는 중",
  page = false,
  ...props
}: LoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className={cx("pm-loading-state", page && "pm-loading-state--page", className)}
      role="status"
      {...props}
    >
      <LoaderCircle className="pm-loading-state__icon" aria-hidden="true" />
      <span>
        <span className="pm-loading-state__label">{label}</span>
        {description ? (
          <span className="pm-loading-state__description">{description}</span>
        ) : null}
      </span>
    </div>
  );
}
