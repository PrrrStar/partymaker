import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cx } from "./utils";

export type ChoiceFeedback = "none" | "correct" | "incorrect";

export type ChoiceButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "prefix"
> & {
  feedback?: ChoiceFeedback;
  marker?: ReactNode;
  selected?: boolean;
};

export function ChoiceButton({
  children,
  className,
  feedback = "none",
  marker,
  selected,
  type = "button",
  ...props
}: ChoiceButtonProps) {
  const feedbackLabel =
    feedback === "correct" ? "정답" : feedback === "incorrect" ? "오답" : null;
  const markerContent =
    feedback === "correct" ? (
      <Check aria-hidden="true" size={16} />
    ) : feedback === "incorrect" ? (
      <X aria-hidden="true" size={16} />
    ) : selected && marker == null ? (
      <Check aria-hidden="true" size={16} />
    ) : (
      marker
    );

  return (
    <button
      aria-pressed={typeof selected === "boolean" ? selected : undefined}
      className={cx(
        "pm-choice",
        selected && "pm-choice--selected",
        feedback !== "none" && `pm-choice--${feedback}`,
        className,
      )}
      type={type}
      {...props}
    >
      <span className="pm-choice__marker" aria-hidden="true">
        {markerContent}
      </span>
      <span className="pm-choice__content">{children}</span>
      {feedbackLabel ? <span className="sr-only">({feedbackLabel})</span> : null}
    </button>
  );
}
