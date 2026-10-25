"use client";

import { motion, useReducedMotion } from "motion/react";

/** One shared entrance: a short fade and 8px rise. Disabled when the user prefers reduced motion. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}
