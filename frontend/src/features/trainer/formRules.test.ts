import { describe, expect, it } from "vitest";
import { EXERCISES } from "./exercises";
import { liveCue, scoreRep } from "./formRules";

const squat = EXERCISES.squat; // idealBottom 90

describe("scoreRep", () => {
  it("awards full marks for reaching ideal depth", () => {
    expect(scoreRep(squat, squat.idealBottom).formScore).toBe(100);
    expect(scoreRep(squat, squat.idealBottom - 20).formScore).toBe(100);
  });

  it("penalizes and flags a shallow rep", () => {
    const result = scoreRep(squat, squat.idealBottom + 40);
    expect(result.formScore).toBeLessThan(100);
    expect(result.flags.shallow).toBe(true);
  });

  it("keeps the score within [0, 100]", () => {
    for (const bottom of [10, 90, 130, 180]) {
      const { formScore } = scoreRep(squat, bottom);
      expect(formScore).toBeGreaterThanOrEqual(0);
      expect(formScore).toBeLessThanOrEqual(100);
    }
  });
});

describe("liveCue", () => {
  it("prompts to stand in frame when the angle is unavailable", () => {
    expect(liveCue(squat, NaN, "up")).toMatch(/frame/i);
  });

  it("emits the shallow cue when dipping but not deep enough", () => {
    expect(liveCue(squat, squat.idealBottom + 30, "down")).toBe(squat.shallowCue);
  });
});
