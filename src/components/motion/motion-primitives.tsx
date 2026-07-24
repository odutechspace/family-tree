"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/src/lib/utils";

type DivMotionProps = Omit<HTMLMotionProps<"div">, "children"> & { children?: ReactNode };

const ease = [0.25, 0.1, 0.25, 1] as const;

export const motionTransition = { duration: 0.32, ease };

export const staggerDelay = 0.05;

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: staggerDelay, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: motionTransition },
};

type FadeInProps = DivMotionProps & { delay?: number };

export function FadeIn({ className, children, delay = 0, transition, ...props }: FadeInProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { ...motionTransition, delay, ...(typeof transition === "object" && transition !== null ? transition : {}) }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({ className, children, ...props }: DivMotionProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={cn(className)}>{children}</div>;
  }
  return (
    <motion.div
      className={cn(className)}
      variants={listVariants}
      initial="hidden"
      animate="show"
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ className, children, ...props }: DivMotionProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={cn(className)}>{children}</div>;
  }
  return (
    <motion.div className={cn(className)} variants={itemVariants} {...props}>
      {children}
    </motion.div>
  );
}
