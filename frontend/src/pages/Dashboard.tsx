import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Disclaimer,
  ErrorState,
  Loading,
  PageHeader,
  StatTile,
  cardBase,
  cardInteractive,
} from "../components/ui";
import { api } from "../lib/api";
import type { DashboardSummary } from "../lib/types";
import { useAuthStore } from "../store/authStore";

const CARDS = [
  { to: "/app/trainer", title: "AI Trainer", blurb: "Webcam rep counting & form feedback" },
  { to: "/app/performance", title: "Performance", blurb: "Your score & weekly trend" },
  { to: "/app/diet", title: "Dietician", blurb: "BMI, TDEE & meal plan" },
  { to: "/app/chat", title: "Gym Buddy", blurb: "Chat with your AI coach" },
  { to: "/app/habits", title: "Habits", blurb: "Streaks & skip-risk nudges" },
  { to: "/app/iot", title: "Smart Gym", blurb: "Live equipment sensors" },
  { to: "/app/reco", title: "Recommendations", blurb: "Gyms & programs for you" },
];

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; data: DashboardSummary };

function SummaryStrip() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .get<DashboardSummary>("/dashboard/summary")
      .then(({ data }) => {
        if (!cancelled) setState({ kind: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") return <Loading label="Loading your stats…" />;
  if (state.kind === "error")
    return <ErrorState>Could not load your stats.</ErrorState>;

  const s = state.data;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        to="/app/performance"
        label="Latest score"
        value={s.latest_score != null ? `${s.latest_score}` : "—"}
        hint={s.latest_score != null ? "out of 100" : "No sessions yet"}
      />
      <StatTile
        to="/app/diet"
        label="Today's intake"
        value={`${Math.round(s.nutrition_consumed_kcal)} kcal`}
        hint={
          s.nutrition_target_kcal != null
            ? `of ${Math.round(s.nutrition_target_kcal)} target`
            : "No plan yet"
        }
      />
      <StatTile
        to="/app/habits"
        label="Skip risk"
        value={`${Math.round(s.skip_probability * 100)}%`}
        hint={`${s.streak}-day streak`}
      />
      <StatTile
        to="/app/habits"
        label="Active nudges"
        value={`${s.active_nudges}`}
        hint={s.active_nudges > 0 ? "Tap to review" : "All clear"}
      />
    </div>
  );
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const bmi = user?.profile?.bmi;

  return (
    <div>
      <PageHeader
        title={`Welcome${user?.email ? `, ${user.email.split("@")[0]}` : ""}`}
        subtitle={
          bmi != null
            ? `Your current BMI is ${bmi}.`
            : "Complete your profile to unlock personalized plans."
        }
      />

      <SummaryStrip />

      <h2 className="mt-12 text-xs font-semibold uppercase tracking-wide text-ink-4">Modules</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className={`${cardBase} ${cardInteractive} group p-5`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="display text-lg text-ink">{c.title}</h2>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 text-ink-4 transition group-hover:text-accent"
                aria-hidden
              />
            </div>
            <p className="mt-2 text-sm text-ink-3">{c.blurb}</p>
          </Link>
        ))}
      </div>

      <Disclaimer />
    </div>
  );
}
