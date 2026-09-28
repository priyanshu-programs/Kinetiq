import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Pill CTA with a circular arrow badge.
 *
 * Hover animation: the current arrow slides out to the right while a fresh
 * arrow slides in from the left — a conveyor-belt effect achieved with
 * a horizontally-stacked pair of icons inside an overflow-hidden badge
 * that translates on hover.
 */
export function ArrowCta({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-3 rounded-full bg-accent py-1.5 pl-6 pr-1.5 text-sm font-bold uppercase tracking-wide text-accent-ink transition hover:bg-accent-dark"
    >
      {children}

      {/* Badge circle — clips the sliding arrows. justify-start keeps the
          double-width strip left-aligned so exactly one arrow shows at rest. */}
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-start overflow-hidden rounded-full bg-canvas text-ink">
        {/*
          Two arrows sit side-by-side (flex-row, each w-9 wide).
          At rest  → -translate-x-9  (second arrow visible)
          On hover → translate-x-0   (strip slides right: second arrow exits
                                       right, first arrow enters from left)
        */}
        <span
          className="flex -translate-x-9 transition-transform duration-300 ease-in-out group-hover:translate-x-0"
          aria-hidden
        >
          {/* incoming arrow (starts hidden to the left) */}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <ArrowRight className="h-4 w-4" />
          </span>
          {/* current arrow (visible at rest) */}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <ArrowRight className="h-4 w-4" />
          </span>
        </span>
      </span>
    </Link>
  );
}
