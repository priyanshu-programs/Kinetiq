import type { ReactNode } from "react";

/** Base card surface. Exported so <Link> can wear the same skin without nesting. */
export const cardBase =
  "rounded-xl border border-hairline bg-surface transition";

export const cardInteractive =
  "hover:border-accent/50 hover:bg-surface-raised";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`${cardBase} ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
}
