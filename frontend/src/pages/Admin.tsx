import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  ErrorState,
  Loading,
  PageHeader,
  StatTile,
} from "../components/ui";
import { api } from "../lib/api";
import { chart, tooltipStyle } from "../lib/chartTheme";
import type { AdminAnalytics } from "../lib/types";

type State =
  | { kind: "loading" }
  | { kind: "forbidden" }
  | { kind: "error" }
  | { kind: "ready"; data: AdminAnalytics };

export function Admin() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .get<AdminAnalytics>("/admin/analytics")
      .then(({ data }) => {
        if (!cancelled) setState({ kind: "ready", data });
      })
      .catch((err) => {
        if (cancelled) return;
        setState(err?.response?.status === 403 ? { kind: "forbidden" } : { kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader title="Admin Analytics" subtitle="App-wide usage across all users." />

      <div>
        {state.kind === "loading" && <Loading />}
        {state.kind === "forbidden" && (
          <ErrorState>Admins only — you don't have access to this page.</ErrorState>
        )}
        {state.kind === "error" && <ErrorState>Could not load analytics.</ErrorState>}
        {state.kind === "ready" && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <StatTile label="Users" value={`${state.data.total_users}`} />
              <StatTile
                label="Workout sessions"
                value={`${state.data.total_sessions}`}
              />
              <StatTile
                label="Avg performance"
                value={
                  state.data.avg_performance_score != null
                    ? `${state.data.avg_performance_score}`
                    : "—"
                }
              />
              <StatTile
                label="Chat messages"
                value={`${state.data.total_chat_messages}`}
              />
              <StatTile label="Habit logs" value={`${state.data.total_habit_logs}`} />
            </div>

            <Card className="mt-6">
              <h2 className="display mb-6 text-lg text-ink">Sessions by exercise</h2>
              {Object.keys(state.data.sessions_by_exercise).length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-3">
                  No sessions yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={Object.entries(state.data.sessions_by_exercise).map(
                      ([exercise, count]) => ({ exercise, count }),
                    )}
                    margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis dataKey="exercise" stroke={chart.axis} fontSize={12} />
                    <YAxis allowDecimals={false} stroke={chart.axis} fontSize={12} />
                    <Tooltip cursor={{ fill: "#ffffff0d" }} {...tooltipStyle} />
                    <Bar
                      dataKey="count"
                      name="Sessions"
                      fill={chart.accent}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
