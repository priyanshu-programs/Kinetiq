import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  Disclaimer,
  ErrorState,
  Loading,
  PageHeader,
} from "../../components/ui";
import { api } from "../../lib/api";
import { chart, tooltipStyle } from "../../lib/chartTheme";
import type { WeeklyPerformance } from "../../lib/types";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; data: WeeklyPerformance[] };

export function PerformancePage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .get<WeeklyPerformance[]>("/performance/weekly")
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

  return (
    <div>
      <PageHeader title="Performance" subtitle="Your weekly performance-score trend." />

      <Card>
        {state.kind === "loading" && <Loading />}
        {state.kind === "error" && (
          <ErrorState>Could not load your performance data.</ErrorState>
        )}
        {state.kind === "ready" && state.data.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-3">
            No workouts yet — finish a session in the{" "}
            <span className="font-semibold text-accent">AI Trainer</span> to see your
            trend.
          </p>
        )}
        {state.kind === "ready" && state.data.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={state.data.map((d) => ({ ...d, label: `W${d.week}` }))}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" stroke={chart.axis} fontSize={12} />
              <YAxis domain={[0, 100]} stroke={chart.axis} fontSize={12} />
              <Tooltip cursor={{ stroke: chart.grid }} {...tooltipStyle} />
              <Line
                type="monotone"
                dataKey="score"
                name="Score"
                stroke={chart.accent}
                strokeWidth={2}
                dot={{ r: 4, fill: chart.accent, stroke: "none" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Disclaimer>
        Not a medical device. Performance scores are informational only — not medical
        advice.
      </Disclaimer>
    </div>
  );
}
