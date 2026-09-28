import { useEffect, useState } from "react";

import {
  Button,
  Card,
  Disclaimer,
  Loading,
  PageHeader,
} from "../../components/ui";
import { api } from "../../lib/api";
import { status } from "../../lib/chartTheme";
import type { HabitLog, Nudge, RiskResponse } from "../../lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export function HabitsPage() {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [risk, setRisk] = useState<RiskResponse | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return Promise.all([
      api.get<HabitLog[]>("/habits"),
      api.get<RiskResponse>("/habits/risk"),
      api.get<Nudge[]>("/nudges"),
    ]).then(([l, r, n]) => {
      setLogs(l.data);
      setRisk(r.data);
      setNudges(n.data.filter((x) => !x.dismissed));
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  async function logToday(completed: boolean) {
    await api.post("/habits/logs", {
      date: today(),
      planned: true,
      completed,
      time_of_day: new Date().getHours(),
    });
    await refresh();
  }

  async function dismiss(id: number) {
    await api.post(`/nudges/${id}/dismiss`);
    setNudges((prev) => prev.filter((n) => n.id !== id));
  }

  const completedDates = new Set(
    logs.filter((l) => l.completed).map((l) => l.date),
  );
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });

  const riskPct = risk ? Math.round(risk.skip_probability * 100) : 0;
  const riskColor =
    riskPct >= 60 ? status.bad : riskPct >= 35 ? status.warn : status.good;

  return (
    <div>
      <PageHeader
        title="Habit Tracker"
        subtitle="Keep your streak alive — log workouts and watch your skip-risk."
      />

      {nudges.length > 0 && (
        <div className="mb-6 space-y-2">
          {nudges.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between rounded-xl border border-accent/25 bg-accent/5 p-4"
            >
              <div>
                <p className="font-medium text-accent">{n.message}</p>
                {n.reason && <p className="mt-1 text-xs text-ink-3">{n.reason}</p>}
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="ml-4 text-sm uppercase text-ink-3 transition hover:text-ink"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Log today */}
          <Card>
            <h2 className="display text-lg text-ink">Today</h2>
            <p className="mt-1 text-sm text-ink-3">Did you train today?</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => logToday(true)} className="flex-1">
                Completed
              </Button>
              <Button
                variant="outline"
                onClick={() => logToday(false)}
                className="flex-1"
              >
                Skipped
              </Button>
            </div>
          </Card>

          {/* Risk gauge */}
          <Card>
            <h2 className="display text-lg text-ink">Skip-risk today</h2>
            <p className="display mt-3 text-5xl leading-none" style={{ color: riskColor }}>
              {riskPct}%
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-surface-raised">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${riskPct}%`, background: riskColor }}
              />
            </div>
            <ul className="mt-4 space-y-1 text-xs text-ink-4">
              {risk?.factors.map((f) => <li key={f}>• {f}</li>)}
            </ul>
          </Card>

          {/* Streak calendar */}
          <Card>
            <h2 className="display text-lg text-ink">Last 14 days</h2>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {last14.map((d) => (
                <div
                  key={d}
                  title={d}
                  className={`aspect-square rounded ${
                    completedDates.has(d) ? "bg-accent" : "bg-surface-raised"
                  }`}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-4">Lime = completed workout.</p>
          </Card>
        </div>
      )}

      <Disclaimer>
        Not a medical device. Skip-risk and nudges are informational only — not
        medical advice.
      </Disclaimer>
    </div>
  );
}
