import { Link } from "react-router-dom";

import { cardBase, cardInteractive } from "./Card";

/**
 * Replaces the three near-identical local tiles:
 * StatCard (Dashboard), Stat (Admin), Metric (Diet).
 */
export function StatTile({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  to?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-4">
        {label}
      </p>
      <p className="display mt-2 text-3xl leading-none text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${cardBase} ${cardInteractive} block p-4`}>
        {body}
      </Link>
    );
  }
  return <div className={`${cardBase} p-4`}>{body}</div>;
}
