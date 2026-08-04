export interface Vec2 {
  x: number;
  y: number;
}

/** Image-space midpoint (y grows downward, as in canvas/screen coordinates). */
export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const RAD2DEG = 180 / Math.PI;

/**
 * Signed angle (degrees) between the segment a->b and the vertical axis.
 * All left-right/front-back tilt metrics call this with `b` anatomically
 * above `a` (e.g. ankle -> hip, hip -> shoulder, neck -> head-top), so the
 * reference direction is "straight up" (image-space -y): 0 when a->b is
 * perfectly vertical, positive when b leans toward +x (right/forward).
 */
export function angleFromVertical(a: Vec2, b: Vec2): number {
  const v = subtract(b, a);
  return Math.atan2(v.x, -v.y) * RAD2DEG;
}

/**
 * Signed angle (degrees) between the segment a->b and the horizontal axis.
 * Positive = b is lower than a (rightward tilt of a horizontal line such
 * as the shoulder or hip line, using image-space y-down convention).
 */
export function angleFromHorizontal(a: Vec2, b: Vec2): number {
  const v = subtract(b, a);
  return Math.atan2(v.y, v.x) * RAD2DEG;
}

/**
 * Same as {@link angleFromVertical}, but the horizontal (x) component is
 * first multiplied by `forwardSign`. Side-view (front-back) metrics need
 * this because a photographed subject can face either direction in the
 * frame (image +x is "forward" for one facing direction and "backward"
 * for the other); without normalizing by the detected facing direction, a
 * physically neutral pose would compute near 0 for one facing direction
 * and near +/-180 for the other. See {@link angleFromHorizontalSigned}.
 */
export function angleFromVerticalSigned(a: Vec2, b: Vec2, forwardSign: 1 | -1): number {
  const v = subtract(b, a);
  return Math.atan2(forwardSign * v.x, -v.y) * RAD2DEG;
}

/**
 * Same as {@link angleFromHorizontal}, but the horizontal (x) component of
 * the a->b vector is multiplied by `forwardSign` first, so the result is 0
 * for a level a->b segment regardless of which way the subject faces in
 * the frame. Call with `a` = the anatomically-posterior point and `b` =
 * the anatomically-anterior point (e.g. ear->eye, PSIS->ASIS).
 */
export function angleFromHorizontalSigned(a: Vec2, b: Vec2, forwardSign: 1 | -1): number {
  const v = subtract(b, a);
  return Math.atan2(v.y, forwardSign * v.x) * RAD2DEG;
}

/**
 * Same as {@link horizontalOffset}, normalized by `forwardSign` so the sign
 * consistently means "toward the front" / "toward the back" regardless of
 * which way the subject faces in the frame.
 */
export function horizontalOffsetSigned(linePoint: Vec2, target: Vec2, forwardSign: 1 | -1): number {
  return forwardSign * (target.x - linePoint.x);
}

/** Unsigned angle (degrees) between segment p1->p2 and segment p2->p3, at the shared vertex p2. */
export function angleBetweenSegments(p1: Vec2, p2: Vec2, p3: Vec2): number {
  const v1 = subtract(p1, p2);
  const v2 = subtract(p3, p2);
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / mag));
  return Math.acos(cos) * RAD2DEG;
}

/**
 * Signed horizontal distance from the vertical line passing through
 * `linePoint` to `target` (positive = target is to the right).
 */
export function horizontalOffset(linePoint: Vec2, target: Vec2): number {
  return target.x - linePoint.x;
}
