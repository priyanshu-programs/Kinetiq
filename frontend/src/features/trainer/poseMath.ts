/** A 2D point (MediaPipe landmarks expose normalized x/y in [0,1]). */
export interface Point {
  x: number;
  y: number;
}

/**
 * Interior angle at vertex `b` formed by points a-b-c, in degrees [0, 180].
 * Returns NaN if a point coincides with the vertex (degenerate).
 */
export function angle(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return NaN;

  const cos = (v1x * v2x + v1y * v2y) / (mag1 * mag2);
  const clamped = Math.max(-1, Math.min(1, cos));
  return (Math.acos(clamped) * 180) / Math.PI;
}
