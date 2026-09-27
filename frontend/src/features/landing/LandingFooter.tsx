import { ArrowRight, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Disclaimer, Reveal, buttonClass } from "../../components/ui";
import { api } from "../../lib/api";

type HealthState = "checking" | "ok" | "down";

/** Carried over from the original Home.tsx — keeps the backend reachability probe. */
function HealthBadge() {
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    api
      .get("/health")
      .then((r) => setHealth(r.data?.status === "ok" ? "ok" : "down"))
      .catch(() => setHealth("down"));
  }, []);

  const badge = {
    checking: { text: "checking…", cls: "bg-surface-raised text-ink-3", dot: "bg-ink-4" },
    ok: { text: "backend: ok", cls: "bg-accent/10 text-accent", dot: "bg-accent" },
    down: { text: "backend: unreachable", cls: "bg-hot/10 text-hot", dot: "bg-hot" },
  }[health];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
      {badge.text}
    </span>
  );
}

export function LandingFooter() {
  return (
    <footer id="start" className="border-t border-hairline">
      <div className="mx-auto max-w-content px-4 py-24 sm:px-8">
        <Reveal>
          <h2 className="display max-w-4xl text-display-md text-ink">
            Keep showing up and the results will follow
          </h2>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/register" className={buttonClass("accent", "lg")}>
              Create your account <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to="/login" className={buttonClass("outline", "lg")}>
              Log in
            </Link>
          </div>
        </Reveal>

        <div className="mt-20 flex flex-wrap items-center justify-between gap-6 border-t border-hairline pt-8">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-accent" aria-hidden />
            <span className="display text-sm text-ink">Kinetiq</span>
          </div>
          <HealthBadge />
        </div>

        <Disclaimer className="mt-6" />
      </div>
    </footer>
  );
}
