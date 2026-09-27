import type { ExerciseConfig } from "./exercises";

export type Phase = "up" | "down";

export interface RepResult {
  repIndex: number;
  /** Deepest (smallest) angle reached during the rep — used for form scoring. */
  bottomAngle: number;
  /** Time from entering the down phase to completing the rep. */
  tempoMs: number;
}

/**
 * Pure joint-angle state machine. Feed successive angles via `update`; it
 * returns a RepResult on the frame that completes a down→up cycle, else null.
 * The gap between `downAngle` and `upAngle` provides hysteresis against jitter,
 * and non-finite angles (no/partial person) are ignored so they can't add reps.
 */
export class RepCounter {
  private phase: Phase = "up";
  private count = 0;
  private bottomAngle = 180;
  private downStartTs = 0;
  private readonly cfg: ExerciseConfig;

  constructor(cfg: ExerciseConfig) {
    this.cfg = cfg;
  }

  update(angle: number, ts: number): RepResult | null {
    if (!Number.isFinite(angle)) return null;

    if (this.phase === "up") {
      if (angle < this.cfg.downAngle) {
        this.phase = "down";
        this.bottomAngle = angle;
        this.downStartTs = ts;
      }
      return null;
    }

    // phase === "down"
    this.bottomAngle = Math.min(this.bottomAngle, angle);
    if (angle > this.cfg.upAngle) {
      this.phase = "up";
      this.count += 1;
      const result: RepResult = {
        repIndex: this.count,
        bottomAngle: this.bottomAngle,
        tempoMs: Math.max(0, Math.round(ts - this.downStartTs)),
      };
      this.bottomAngle = 180;
      return result;
    }
    return null;
  }

  get reps(): number {
    return this.count;
  }

  get currentPhase(): Phase {
    return this.phase;
  }
}
