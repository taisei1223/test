import { keypointsForView, type View } from "./keypoints";
import type { KeypointMap, Point2D } from "./mediapipeMapping";

/**
 * Evenly-spaced placeholder positions for every keypoint of a view, used
 * when automatic detection is unavailable (model failed to load / no pose
 * found) or a user wants to place a point that wasn't auto-detected. Every
 * point starts visible and draggable rather than missing, matching
 * requirements doc 4.2's "manual correction UI" and the doc's section 8
 * fallback of treating hard-to-detect landmarks as manually-placed
 * reference points.
 */
export function defaultKeypoints(view: View, imageWidth: number, imageHeight: number): KeypointMap {
  const defs = keypointsForView(view);
  const map: KeypointMap = {};
  const n = defs.length;
  defs.forEach((def, i) => {
    const y = imageHeight * (0.08 + (0.86 * i) / Math.max(n - 1, 1));
    // Bilateral (L/R) point pairs default to either side of center so they
    // don't start stacked on top of each other.
    const isLeft = def.name.endsWith("L");
    const isRight = def.name.endsWith("R") && defs.some((d) => d.name === (def.name.slice(0, -1) + "L"));
    const x = imageWidth * (isLeft ? 0.42 : isRight ? 0.58 : 0.5);
    const point: Point2D = { x, y, score: 0, estimated: true };
    map[def.name] = point;
  });
  return map;
}
