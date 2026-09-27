import { describe, expect, it } from "vitest";
import { EXERCISES } from "./exercises";
import { RepCounter } from "./repCounter";

const squat = EXERCISES.squat; // up>160, down<100

/** Feed a sequence of angles and return reps counted. */
function run(angles: number[]): RepCounter {
  const rc = new RepCounter(squat);
  angles.forEach((a, i) => rc.update(a, i * 100));
  return rc;
}

describe("RepCounter", () => {
  it("counts one rep per full down→up cycle", () => {
    // start up, dip down, return up — twice
    const rc = run([170, 120, 80, 120, 170, 130, 70, 140, 175]);
    expect(rc.reps).toBe(2);
  });

  it("does not count while holding the up position", () => {
    const rc = run([170, 172, 168, 175, 169]);
    expect(rc.reps).toBe(0);
  });

  it("does not count incomplete reps (down but not back up)", () => {
    const rc = run([170, 120, 70, 95]); // never crosses upAngle again
    expect(rc.reps).toBe(0);
  });

  it("ignores non-finite angles (no person in frame)", () => {
    const rc = run([NaN, NaN, 170, NaN, 80, NaN, 170]);
    expect(rc.reps).toBe(1);
  });

  it("reports the deepest angle reached during the rep", () => {
    const rc = new RepCounter(squat);
    rc.update(170, 0);
    rc.update(90, 100);
    rc.update(75, 200);
    const result = rc.update(170, 300);
    expect(result?.bottomAngle).toBe(75);
  });
});
