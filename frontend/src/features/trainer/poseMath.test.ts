import { describe, expect, it } from "vitest";
import { angle } from "./poseMath";

describe("angle", () => {
  it("measures a right angle", () => {
    // a above vertex, c to the right of vertex => 90°
    const a = { x: 0, y: 1 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };
    expect(angle(a, b, c)).toBeCloseTo(90, 5);
  });

  it("measures a straight angle", () => {
    const a = { x: -1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };
    expect(angle(a, b, c)).toBeCloseTo(180, 5);
  });

  it("measures a zero angle when rays overlap", () => {
    const a = { x: 1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: 2, y: 0 };
    expect(angle(a, b, c)).toBeCloseTo(0, 5);
  });

  it("returns NaN for a degenerate point on the vertex", () => {
    const b = { x: 0, y: 0 };
    expect(Number.isNaN(angle(b, b, { x: 1, y: 0 }))).toBe(true);
  });
});
