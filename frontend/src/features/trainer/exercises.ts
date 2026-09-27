import type { Exercise } from "../../lib/types";

/**
 * Per-exercise tuning. Each exercise tracks one joint angle (a-b-c by MediaPipe
 * Pose landmark index) that swings between an extended "up" pose and a flexed
 * "down" pose. A rep is one full down→up cycle.
 *
 * MediaPipe BlazePose indices used here:
 *   11/12 shoulder · 13/14 elbow · 15/16 wrist · 23/24 hip · 25/26 knee · 27/28 ankle
 */
export interface ExerciseConfig {
  label: string;
  /** Landmark indices [a, b, c]; the angle is measured at b. */
  joint: [number, number, number];
  /** Angle (deg) above which the limb is considered "up"/extended. */
  upAngle: number;
  /** Angle (deg) below which the limb is considered "down"/flexed. */
  downAngle: number;
  /** Deepest angle (deg) that earns a full form score. */
  idealBottom: number;
  /** A "full" session for the completion component of the score. */
  targetReps: number;
  /** Cue shown when the rep is too shallow. */
  shallowCue: string;
  /** Cue shown at rest / between reps. */
  readyCue: string;
}

export const EXERCISES: Record<Exercise, ExerciseConfig> = {
  squat: {
    label: "Squat",
    joint: [23, 25, 27], // hip → knee → ankle
    upAngle: 160,
    downAngle: 100,
    idealBottom: 90,
    targetReps: 12,
    shallowCue: "Go deeper — aim for thighs parallel",
    readyCue: "Stand tall, then squat down",
  },
  pushup: {
    label: "Push-up",
    joint: [11, 13, 15], // shoulder → elbow → wrist
    upAngle: 160,
    downAngle: 90,
    idealBottom: 80,
    targetReps: 12,
    shallowCue: "Lower your chest further",
    readyCue: "Lower down with control",
  },
  bicep_curl: {
    label: "Bicep Curl",
    joint: [11, 13, 15], // shoulder → elbow → wrist
    upAngle: 150,
    downAngle: 55,
    idealBottom: 45,
    targetReps: 12,
    shallowCue: "Curl all the way up",
    readyCue: "Extend, then curl up",
  },
};

export const EXERCISE_ORDER: Exercise[] = ["squat", "pushup", "bicep_curl"];
