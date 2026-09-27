import type { ReactNode } from "react";

/**
 * Medical disclaimer. Required on every module page (Phase 6 acceptance item).
 * Pages pass their own wording where it differed; the default matches Dashboard.
 */
export function Disclaimer({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-8 text-xs text-ink-4 ${className}`}>
      {children ?? (
        <>
          Not a medical device. Health and fitness output is informational only —
          not medical advice.
        </>
      )}
    </p>
  );
}
