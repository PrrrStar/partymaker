"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cx } from "./utils";

export type MotionRevealProps = Omit<
  HTMLMotionProps<"div">,
  "animate" | "children" | "initial" | "transition"
> & {
  children: ReactNode;
  delay?: number;
};

export function MotionReveal({
  children,
  className,
  delay = 0,
  ...props
}: MotionRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      className={cx(className)}
      initial={
        shouldReduceMotion
          ? false
          : { opacity: 0, transform: "translateY(12px)" }
      }
      transition={{
        delay: shouldReduceMotion ? 0 : delay,
        duration: shouldReduceMotion ? 0 : 0.36,
        ease: [0.22, 1, 0.36, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
