import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import { Button, Card, Disclaimer, PageHeader } from "../../components/ui";
import { api } from "../../lib/api";
import type {
  Exercise,
  PerformanceScore,
  RepEventPayload,
  WorkoutSession,
} from "../../lib/types";
import { EXERCISES, EXERCISE_ORDER } from "./exercises";
import { PoseCanvas } from "./PoseCanvas";
import { RepCounter } from "./repCounter";
import { angle } from "./poseMath";
import { liveCue, scoreRep } from "./formRules";
import { usePoseLandmarker, type FrameHandler } from "./usePoseLandmarker";

const VISIBILITY_MIN = 0.5;

interface Summary {
  session: WorkoutSession;
  performance_score: PerformanceScore;
}

export function TrainerPage() {
  const [exercise, setExercise] = useState<Exercise>("squat");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reps, setReps] = useState(0);
  const [form, setForm] = useState(100);
  const [cue, setCue] = useState("Pick an exercise and press Start");
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const sessionIdRef = useRef<number | null>(null);
  const counterRef = useRef<RepCounter | null>(null);
  const eventsRef = useRef<RepEventPayload[]>([]);

  const handleFrame = useCallback<FrameHandler>(
    (lms, ts) => {
      setLandmarks(lms);
      if (!active || !counterRef.current) return;

      const cfg = EXERCISES[exercise];
      const [a, b, c] = cfg.joint;
      let ang = NaN;
      if (
        lms &&
        (lms[a]?.visibility ?? 1) > VISIBILITY_MIN &&
        (lms[b]?.visibility ?? 1) > VISIBILITY_MIN &&
        (lms[c]?.visibility ?? 1) > VISIBILITY_MIN
      ) {
        ang = angle(lms[a], lms[b], lms[c]);
      }

      const counter = counterRef.current;
      const result = counter.update(ang, ts);
      if (result) {
        const { formScore, flags } = scoreRep(cfg, result.bottomAngle);
        eventsRef.current.push({
          rep_index: result.repIndex - 1,
          form_score: formScore,
          tempo_ms: result.tempoMs,
          flags,
        });
        setReps(result.repIndex);
        setForm(Math.round(formScore));
      }
      setCue(liveCue(cfg, ang, counter.currentPhase));
    },
    [active, exercise],
  );

  const pose = usePoseLandmarker(handleFrame);

  const start = async () => {
    setApiError(null);
    setSummary(null);
    setBusy(true);
    try {
      const { data } = await api.post<{ session_id: number }>("/workouts/sessions", {
        exercise,
      });
      sessionIdRef.current = data.session_id;
      counterRef.current = new RepCounter(EXERCISES[exercise]);
      eventsRef.current = [];
      setReps(0);
      setForm(100);
      await pose.start();
      setActive(true);
    } catch {
      setApiError("Could not start a session. Is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setActive(false);
    pose.stop();
    const sessionId = sessionIdRef.current;
    if (sessionId == null) return;
    setBusy(true);
    try {
      const { data } = await api.post<Summary>(
        `/workouts/sessions/${sessionId}/finish`,
        { total_reps: eventsRef.current.length, rep_events: eventsRef.current },
      );
      setSummary(data);
    } catch {
      setApiError("Could not save the session.");
    } finally {
      setBusy(false);
      sessionIdRef.current = null;
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Gym Trainer"
        subtitle="Webcam pose tracking with live rep counting and form feedback. Your video never leaves this device."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Webcam + overlay */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {EXERCISE_ORDER.map((ex) => (
              <button
                key={ex}
                onClick={() => setExercise(ex)}
                disabled={active}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                  exercise === ex
                    ? "bg-accent text-accent-ink"
                    : "bg-surface-raised text-ink-2 hover:text-ink"
                } disabled:opacity-50`}
              >
                {EXERCISES[ex].label}
              </button>
            ))}
          </div>

          <PoseCanvas videoRef={pose.videoRef} landmarks={landmarks} />

          <div className="mt-3 flex items-center gap-3">
            {!active ? (
              <Button onClick={start} disabled={busy}>
                {busy ? "Starting…" : "Start"}
              </Button>
            ) : (
              <Button variant="danger" onClick={stop} disabled={busy}>
                {busy ? "Saving…" : "Stop & save"}
              </Button>
            )}
            {pose.status === "running" && (
              <span className="text-sm text-ink-4">{pose.fps} FPS</span>
            )}
          </div>

          {pose.status === "loading" && (
            <p className="mt-3 text-sm text-ink-3">Downloading pose model…</p>
          )}
          {pose.status === "denied" && (
            <p className="mt-3 text-sm text-hot">{pose.error}</p>
          )}
          {pose.status === "error" && (
            <p className="mt-3 text-sm text-hot">
              {pose.error}{" "}
              <button onClick={start} className="underline">
                Retry
              </button>
            </p>
          )}
          {apiError && <p className="mt-3 text-sm text-hot">{apiError}</p>}
        </div>

        {/* HUD */}
        <div className="space-y-4">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-4">
              Reps
            </p>
            <p className="display mt-2 text-6xl leading-none text-ink">{reps}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-4">
              Last rep form
            </p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${form}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-medium text-ink-2">{form}/100</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-4">
              Coach
            </p>
            <p className="mt-2 font-medium text-ink">{cue}</p>
          </Card>

          {summary && (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
              <p className="display text-lg text-ink">Session saved</p>
              <p className="display mt-3 text-4xl leading-none text-accent">
                {summary.performance_score.score}
                <span className="font-sans text-base font-medium text-ink-4">
                  {" "}
                  /100
                </span>
              </p>
              <p className="mt-2 text-sm text-ink-3">
                {summary.session.total_reps} reps · avg form{" "}
                {summary.session.avg_form_score ?? "—"}
              </p>
              <Link
                to="/app/performance"
                className="mt-4 inline-block text-sm font-semibold text-accent underline"
              >
                View weekly trend →
              </Link>
            </div>
          )}
        </div>
      </div>

      <Disclaimer>
        Not a medical device. Form feedback is informational only — not medical
        advice.
      </Disclaimer>
    </div>
  );
}
