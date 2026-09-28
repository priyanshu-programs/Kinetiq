import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const OFFSETS = {
  bottom: { y: 16 },
  right: { x: 28 },
};

/**
 * Scroll reveal used by the landing page: fade + rise (or slide) in, fires once.
 *
 * Honours prefers-reduced-motion by rendering the content already visible —
 * without this the initial opacity:0 would leave sections blank for anyone
 * who has motion disabled.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  from = "bottom",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  from?: keyof typeof OFFSETS;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  const offset = OFFSETS[from];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
