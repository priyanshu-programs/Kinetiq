import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../lib/api";

type HealthState = "checking" | "ok" | "down";

export function Home() {
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    api
      .get("/health")
      .then((r) => setHealth(r.data?.status === "ok" ? "ok" : "down"))
      .catch(() => setHealth("down"));
  }, []);

  const badge = {
    checking: { text: "checking…", cls: "bg-slate-200 text-slate-600" },
    ok: { text: "backend: ok", cls: "bg-emerald-100 text-emerald-700" },
    down: { text: "backend: unreachable", cls: "bg-red-100 text-red-700" },
  }[health];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold text-brand-dark">
        🏋️ AI Gym &amp; Fitness Assistant
      </h1>
      <p className="max-w-md text-slate-600">
        Your AI personal trainer, dietician, motivator, and fitness data manager —
        all in one place.
      </p>
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${badge.cls}`}>
        {badge.text}
      </span>
      <div className="flex gap-3">
        <Link
          to="/login"
          className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-100"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
