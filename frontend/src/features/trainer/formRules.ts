import type { ExerciseConfig } from "./exercises";
import type { Phase } from "./repCounter";

/** Degrees of shallowness tolerated before a rep loses form points. */
const TOLERANCE = 10;
/** Form points deducted per degree the rep falls short of ideal depth. */
const PENALTY_PER_DEGREE = 1.5;

export interface RepForm {
  formScore: number; // 0-100
  flags: Record<string, boolean>;
}

function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, value));
}

/**
 * Score a completed rep from how deep it went. Reaching `idealBottom` (or
 * deeper) earns 100; falling short deducts proportionally.
 */
export function scoreRep(cfg: ExerciseConfig, bottomAngle: number): RepForm {
  const deficit = Math.max(0, bottomAngle - cfg.idealBottom);
  const shallow = deficit > TOLERANCE;
  return {
    formScore: clamp(100 - deficit * PENALTY_PER_DEGREE),
    flags: { shallow },
  };
}

/** Live coaching cue for the HUD based on the current angle and phase. */
export function liveCue(cfg: ExerciseConfig, angle: number, phase: Phase): string {
  if (!Number.isFinite(angle)) return "Stand fully in frame";
  if (phase === "down") {
    return angle > cfg.idealBottom + TOLERANCE ? cfg.shallowCue : "Good depth — drive up!";
  }
  return cfg.readyCue;
}
