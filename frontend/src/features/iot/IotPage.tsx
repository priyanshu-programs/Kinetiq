import { Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";

import { Card, Disclaimer, PageHeader } from "../../components/ui";
import { api, getToken } from "../../lib/api";
import { chart } from "../../lib/chartTheme";
import type { Device, SensorReading } from "../../lib/types";

type Status = "connecting" | "live" | "reconnecting" | "unauthorized";
type Point = { ts: number; value: number };

const BUFFER = 30;
// The backend closes with 4401 when the token is missing or invalid; retrying
// that forever would hammer a sleeping backend for nothing.
const WS_UNAUTHORIZED = 4401;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;
const METRIC_UNIT: Record<string, string> = {
  heart_rate: "bpm",
  speed: "km/h",
  resistance: "lvl",
  reps: "",
};

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const proto = base.startsWith("https") ? "wss" : "ws";
  const host = base.replace(/^https?:\/\//, "");
  return `${proto}://${host}/ws/iot?token=${getToken() ?? ""}`;
}

export function IotPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [latest, setLatest] = useState<Record<number, SensorReading>>({});
  const [series, setSeries] = useState<Record<number, Point[]>>({});
  const [status, setStatus] = useState<Status>("connecting");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    api.get<Device[]>("/iot/devices").then(({ data }) => setDevices(data)).catch(() => {});
  }, []);

  useEffect(() => {
    alive.current = true;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let attempt = 0;

    function connect() {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => {
        attempt = 0;
        if (alive.current) setStatus("live");
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as {
          type: string;
          readings: SensorReading[];
        };
        if (msg.type !== "readings") return;
        setLatest((prev) => {
          const next = { ...prev };
          for (const r of msg.readings) next[r.device_id] = r;
          return next;
        });
        setSeries((prev) => {
          const next = { ...prev };
          for (const r of msg.readings) {
            const buf = [...(next[r.device_id] ?? []), { ts: Date.parse(r.ts), value: r.value }];
            next[r.device_id] = buf.slice(-BUFFER);
          }
          return next;
        });
        const withSuggestion = msg.readings.find((r) => r.suggestion);
        if (withSuggestion?.suggestion) setSuggestion(withSuggestion.suggestion);
      };
      ws.onclose = (ev) => {
        if (!alive.current) return;
        if (ev.code === WS_UNAUTHORIZED) {
          setStatus("unauthorized");
          return;
        }
        setStatus("reconnecting");
        // Exponential backoff with a cap: a sleeping backend can take tens of
        // seconds to wake, and a fixed 2s retry just piles requests onto it.
        const delay = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
        attempt += 1;
        retry = setTimeout(connect, delay);
      };
      ws.onerror = () => ws?.close();
    }

    connect();
    return () => {
      alive.current = false;
      clearTimeout(retry);
      ws?.close();
    };
  }, []);

  const statusBadge = {
    connecting: { text: "Connecting…", cls: "bg-surface-raised text-ink-3" },
    live: { text: "● Live", cls: "bg-accent/10 text-accent" },
    reconnecting: { text: "Reconnecting…", cls: "bg-hot/10 text-hot" },
    unauthorized: { text: "Session expired — sign in again", cls: "bg-hot/10 text-hot" },
  }[status];

  return (
    <div>
      <PageHeader
        title="Smart Gym"
        subtitle="Live (simulated) sensor data from your equipment."
        actions={
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge.cls}`}
          >
            {statusBadge.text}
          </span>
        }
      />

      {suggestion && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm font-medium text-accent">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {suggestion}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => {
          const reading = latest[d.id];
          const data = series[d.id] ?? [];
          return (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{d.name}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-4">{d.type}</span>
              </div>
              <p className="display mt-3 text-4xl leading-none text-ink">
                {reading ? reading.value : "—"}{" "}
                <span className="font-sans text-sm font-normal text-ink-4">
                  {reading ? METRIC_UNIT[reading.metric] : ""}
                </span>
              </p>
              <div className="mt-3 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chart.accent}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })}
      </div>

      {devices.length === 0 && (
        <p className="py-12 text-center text-sm text-ink-3">No devices streaming.</p>
      )}

      <Disclaimer>
        Not a medical device. Sensor readings and suggestions are informational only
        — not medical advice.
      </Disclaimer>
    </div>
  );
}
