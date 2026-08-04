import type { KeypointMap, Point2D } from "./mediapipeMapping";
import type { KeypointName, View } from "./keypoints";
import {
  midpoint,
  distance,
  angleFromVertical,
  angleFromVerticalSigned,
  angleFromHorizontal,
  angleFromHorizontalSigned,
  angleBetweenSegments,
  horizontalOffset,
  horizontalOffsetSigned,
} from "./geometry";

export type MetricUnit = "deg" | "px" | "cm";

export interface MetricDef {
  key: string;
  label: string;
  category: "leftRight" | "frontBack";
  view: View;
  unit: MetricUnit;
  /**
   * Tentative +/- reference band used only to color the result UI
   * (green/amber/red). NOT a clinically validated normal range — see
   * requirements doc section 8 ("医療情報としての扱い"). Must be reviewed
   * by a qualified professional before being presented as a real
   * assessment threshold.
   */
  referenceBand: number;
  requiredPoints: KeypointName[];
}

export interface MetricResult extends MetricDef {
  value: number;
  /** True if any keypoint feeding this metric was a geometric estimate rather than a direct detection. */
  estimated: boolean;
  available: boolean;
}

function pick(kp: KeypointMap, name: KeypointName): Point2D | undefined {
  return kp[name];
}

function midOf(kp: KeypointMap, a: KeypointName, b: KeypointName): Point2D | undefined {
  const pa = pick(kp, a);
  const pb = pick(kp, b);
  if (pa && pb) return { ...midpoint(pa, pb), score: Math.min(pa.score, pb.score), estimated: pa.estimated || pb.estimated };
  return pa ?? pb;
}

const SEGMENT_WEIGHT = {
  head: 8.1,
  trunk: 45.5,
  arm: 5.0,
  leg: 16.1,
};

/**
 * Center of gravity, approximated as a segment-mass-weighted average of
 * head/trunk/arm/leg midpoints (see requirements doc section 3.3 footnote
 * and section 8, which leave the exact center-of-gravity method open —
 * this implementation picks the "weighted average of keypoints" option
 * explicitly, since the alternative (ankle midpoint) is degenerate for the
 * "whole body left-right tilt" metric that measures ankleMid -> COG).
 */
export function computeCenterOfGravity(kp: KeypointMap): Point2D | undefined {
  const headTop = pick(kp, "headTop");
  const neckMid = pick(kp, "neckMid");
  const shoulderMid = midOf(kp, "shoulderL", "shoulderR") ?? pick(kp, "shoulderR");
  const trochanterMid = midOf(kp, "trochanterL", "trochanterR") ?? pick(kp, "trochanterR");
  const wristL = pick(kp, "wristL");
  const wristR = pick(kp, "wristR");
  const ankleL = pick(kp, "ankleL");
  const ankleR = pick(kp, "ankleR");
  const trochanterL = pick(kp, "trochanterL");
  const trochanterR = pick(kp, "trochanterR");
  const shoulderL = pick(kp, "shoulderL");
  const shoulderR = pick(kp, "shoulderR");

  const parts: { point: Point2D; weight: number }[] = [];
  if (headTop && neckMid) parts.push({ point: midpoint(headTop, neckMid) as Point2D, weight: SEGMENT_WEIGHT.head });
  if (shoulderMid && trochanterMid) parts.push({ point: midpoint(shoulderMid, trochanterMid) as Point2D, weight: SEGMENT_WEIGHT.trunk });
  if (shoulderL && wristL) parts.push({ point: midpoint(shoulderL, wristL) as Point2D, weight: SEGMENT_WEIGHT.arm });
  if (shoulderR && wristR) parts.push({ point: midpoint(shoulderR, wristR) as Point2D, weight: SEGMENT_WEIGHT.arm });
  if (trochanterL && ankleL) parts.push({ point: midpoint(trochanterL, ankleL) as Point2D, weight: SEGMENT_WEIGHT.leg });
  if (trochanterR && ankleR) parts.push({ point: midpoint(trochanterR, ankleR) as Point2D, weight: SEGMENT_WEIGHT.leg });

  if (parts.length === 0) return undefined;
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const x = parts.reduce((s, p) => s + p.point.x * p.weight, 0) / totalWeight;
  const y = parts.reduce((s, p) => s + p.point.y * p.weight, 0) / totalWeight;
  const estimated = parts.some((p) => p.point.estimated);
  return { x, y, score: 1, estimated };
}

function result(def: MetricDef, value: number, estimated: boolean, available: boolean): MetricResult {
  return { ...def, value: available ? Number(value.toFixed(2)) : NaN, estimated, available };
}

/** Left-right tilt metrics from the front-view photo (requirements doc section 3.2). */
export function computeLeftRightMetrics(kp: KeypointMap): MetricResult[] {
  const cog = computeCenterOfGravity(kp);
  const shoulderMid = midOf(kp, "shoulderL", "shoulderR");
  const trochanterMid = midOf(kp, "trochanterL", "trochanterR");
  const ankleMid = midOf(kp, "ankleL", "ankleR");

  const defs: { def: MetricDef; compute: () => { value: number; estimated: boolean; available: boolean } }[] = [
    {
      def: { key: "wholeBodyLR", label: "全身の左右傾き", category: "leftRight", view: "front", unit: "deg", referenceBand: 3, requiredPoints: ["ankleL", "ankleR"] },
      compute: () => {
        if (!ankleMid || !cog) return { value: NaN, estimated: false, available: false };
        return { value: angleFromVertical(ankleMid, cog), estimated: ankleMid.estimated || cog.estimated, available: true };
      },
    },
    {
      def: { key: "upperBodyLR", label: "上半身の左右傾き", category: "leftRight", view: "front", unit: "deg", referenceBand: 3, requiredPoints: ["trochanterL", "trochanterR", "shoulderL", "shoulderR"] },
      compute: () => {
        if (!trochanterMid || !shoulderMid) return { value: NaN, estimated: false, available: false };
        return { value: angleFromVertical(trochanterMid, shoulderMid), estimated: trochanterMid.estimated || shoulderMid.estimated, available: true };
      },
    },
    {
      def: { key: "lowerBodyLR", label: "下半身の左右傾き", category: "leftRight", view: "front", unit: "deg", referenceBand: 3, requiredPoints: ["ankleL", "ankleR", "trochanterL", "trochanterR"] },
      compute: () => {
        if (!ankleMid || !trochanterMid) return { value: NaN, estimated: false, available: false };
        return { value: angleFromVertical(ankleMid, trochanterMid), estimated: ankleMid.estimated || trochanterMid.estimated, available: true };
      },
    },
    {
      def: { key: "headLR", label: "頭の左右傾き", category: "leftRight", view: "front", unit: "deg", referenceBand: 3, requiredPoints: ["neckMid", "headTop"] },
      compute: () => {
        const neckMid = pick(kp, "neckMid");
        const headTop = pick(kp, "headTop");
        if (!neckMid || !headTop) return { value: NaN, estimated: false, available: false };
        return { value: angleFromVertical(neckMid, headTop), estimated: neckMid.estimated || headTop.estimated, available: true };
      },
    },
    {
      def: { key: "neckOffsetLR", label: "首の左右位置ずれ", category: "leftRight", view: "front", unit: "px", referenceBand: 15, requiredPoints: ["neckMid"] },
      compute: () => {
        const neckMid = pick(kp, "neckMid");
        if (!neckMid || !cog) return { value: NaN, estimated: false, available: false };
        return { value: horizontalOffset(cog, neckMid), estimated: neckMid.estimated || cog.estimated, available: true };
      },
    },
    {
      def: { key: "shoulderLR", label: "肩の左右傾き", category: "leftRight", view: "front", unit: "deg", referenceBand: 3, requiredPoints: ["shoulderL", "shoulderR"] },
      compute: () => {
        const l = pick(kp, "shoulderL");
        const r = pick(kp, "shoulderR");
        if (!l || !r) return { value: NaN, estimated: false, available: false };
        // In a normal (non-selfie-mirrored) front photo the subject's
        // anatomical left shoulder appears on the image's right (larger x)
        // and vice versa, so the "0 = level" reference direction runs
        // right-shoulder -> left-shoulder, not left -> right.
        return { value: angleFromHorizontal(r, l), estimated: l.estimated || r.estimated, available: true };
      },
    },
    {
      def: { key: "chestOffsetLR", label: "胸の左右位置ずれ", category: "leftRight", view: "front", unit: "px", referenceBand: 15, requiredPoints: ["shoulderL", "shoulderR"] },
      compute: () => {
        if (!shoulderMid || !cog) return { value: NaN, estimated: false, available: false };
        return { value: horizontalOffset(cog, shoulderMid), estimated: shoulderMid.estimated || cog.estimated, available: true };
      },
    },
    {
      def: { key: "hipLR", label: "腰の左右傾き", category: "leftRight", view: "front", unit: "deg", referenceBand: 3, requiredPoints: ["trochanterL", "trochanterR"] },
      compute: () => {
        const l = pick(kp, "trochanterL");
        const r = pick(kp, "trochanterR");
        if (!l || !r) return { value: NaN, estimated: false, available: false };
        // Same left/right image-position convention as shoulderLR above.
        return { value: angleFromHorizontal(r, l), estimated: l.estimated || r.estimated, available: true };
      },
    },
    {
      def: { key: "hipOffsetLR", label: "腰の左右位置ずれ", category: "leftRight", view: "front", unit: "px", referenceBand: 15, requiredPoints: ["trochanterL", "trochanterR"] },
      compute: () => {
        if (!trochanterMid || !cog) return { value: NaN, estimated: false, available: false };
        return { value: horizontalOffset(cog, trochanterMid), estimated: trochanterMid.estimated || cog.estimated, available: true };
      },
    },
  ];

  return defs.map(({ def, compute }) => {
    const r = compute();
    return result(def, r.value, r.estimated, r.available);
  });
}

/**
 * A side-view subject can face either direction in the frame (nothing
 * pins "forward" to +x or -x in image space), so every front-back metric
 * must be normalized by the actual facing direction or a physically
 * neutral pose will read as ~180 deg for one facing direction and ~0 deg
 * for the other. Detected from the eye/ear pair: the eye (front of the
 * head) sits further in the facing direction than the ear (back of the
 * head). Falls back to "+1" (treated as facing image-right) when eye/ear
 * aren't both available.
 */
function detectFacingDir(kp: KeypointMap): 1 | -1 {
  const earR = pick(kp, "earR");
  const eyeR = pick(kp, "eyeR");
  if (earR && eyeR && eyeR.x !== earR.x) {
    return eyeR.x >= earR.x ? 1 : -1;
  }
  return 1;
}

/** Front-back tilt metrics from the side-view photo (requirements doc section 3.3). */
export function computeFrontBackMetrics(kp: KeypointMap): MetricResult[] {
  const cog = computeCenterOfGravity(kp);
  const facingDir = detectFacingDir(kp);

  const defs: { def: MetricDef; compute: () => { value: number; estimated: boolean; available: boolean } }[] = [
    {
      def: { key: "wholeBodyFB", label: "全身の前後傾き", category: "frontBack", view: "side", unit: "deg", referenceBand: 3, requiredPoints: ["ankleR"] },
      compute: () => {
        const ankleR = pick(kp, "ankleR");
        if (!ankleR || !cog) return { value: NaN, estimated: false, available: false };
        return { value: angleFromVerticalSigned(ankleR, cog, facingDir), estimated: ankleR.estimated || cog.estimated, available: true };
      },
    },
    {
      def: { key: "upperBodyFB", label: "上半身の前後傾き", category: "frontBack", view: "side", unit: "deg", referenceBand: 3, requiredPoints: ["trochanterR", "shoulderR"] },
      compute: () => {
        const trochanterR = pick(kp, "trochanterR");
        const shoulderR = pick(kp, "shoulderR");
        if (!trochanterR || !shoulderR) return { value: NaN, estimated: false, available: false };
        return { value: angleFromVerticalSigned(trochanterR, shoulderR, facingDir), estimated: trochanterR.estimated || shoulderR.estimated, available: true };
      },
    },
    {
      def: { key: "lowerBodyFB", label: "下半身の前後傾き", category: "frontBack", view: "side", unit: "deg", referenceBand: 3, requiredPoints: ["ankleR", "trochanterR"] },
      compute: () => {
        const ankleR = pick(kp, "ankleR");
        const trochanterR = pick(kp, "trochanterR");
        if (!ankleR || !trochanterR) return { value: NaN, estimated: false, available: false };
        return { value: angleFromVerticalSigned(ankleR, trochanterR, facingDir), estimated: ankleR.estimated || trochanterR.estimated, available: true };
      },
    },
    {
      def: { key: "headFB", label: "頭の前後傾き", category: "frontBack", view: "side", unit: "deg", referenceBand: 5, requiredPoints: ["earR", "eyeR"] },
      compute: () => {
        const earR = pick(kp, "earR");
        const eyeR = pick(kp, "eyeR");
        if (!earR || !eyeR) return { value: NaN, estimated: false, available: false };
        return { value: angleFromHorizontalSigned(earR, eyeR, facingDir), estimated: earR.estimated || eyeR.estimated, available: true };
      },
    },
    {
      def: { key: "headOffsetFB", label: "頭の前後位置ずれ", category: "frontBack", view: "side", unit: "px", referenceBand: 20, requiredPoints: ["shoulderR", "earR"] },
      compute: () => {
        const shoulderR = pick(kp, "shoulderR");
        const earR = pick(kp, "earR");
        if (!shoulderR || !earR) return { value: NaN, estimated: false, available: false };
        return { value: horizontalOffsetSigned(shoulderR, earR, facingDir), estimated: shoulderR.estimated || earR.estimated, available: true };
      },
    },
    {
      def: { key: "pelvisFB", label: "骨盤の前後傾き", category: "frontBack", view: "side", unit: "deg", referenceBand: 5, requiredPoints: ["asisR", "psisR"] },
      compute: () => {
        const asisR = pick(kp, "asisR");
        const psisR = pick(kp, "psisR");
        if (!asisR || !psisR) return { value: NaN, estimated: false, available: false };
        return { value: angleFromHorizontalSigned(psisR, asisR, facingDir), estimated: asisR.estimated || psisR.estimated, available: true };
      },
    },
    {
      // angleBetweenSegments is direction-agnostic (0-180, magnitude only)
      // and reads ~180 for a straight ankle-trochanter-shoulder line, so we
      // report the deviation from straight (180 - angle) to keep this
      // metric's "0 = neutral" convention consistent with every other one.
      def: { key: "lumbarOffsetFB", label: "腰の前後位置ずれ", category: "frontBack", view: "side", unit: "deg", referenceBand: 5, requiredPoints: ["ankleR", "trochanterR", "shoulderR"] },
      compute: () => {
        const ankleR = pick(kp, "ankleR");
        const trochanterR = pick(kp, "trochanterR");
        const shoulderR = pick(kp, "shoulderR");
        if (!ankleR || !trochanterR || !shoulderR) return { value: NaN, estimated: false, available: false };
        return {
          value: 180 - angleBetweenSegments(ankleR, trochanterR, shoulderR),
          estimated: ankleR.estimated || trochanterR.estimated || shoulderR.estimated,
          available: true,
        };
      },
    },
    {
      // Same "deviation from straight" convention as lumbarOffsetFB: 0 for
      // a fully extended knee, larger for more flexion.
      def: { key: "kneeFlexion", label: "膝の曲がり度合い", category: "frontBack", view: "side", unit: "deg", referenceBand: 5, requiredPoints: ["ankleR", "kneeR", "trochanterR"] },
      compute: () => {
        const ankleR = pick(kp, "ankleR");
        const kneeR = pick(kp, "kneeR");
        const trochanterR = pick(kp, "trochanterR");
        if (!ankleR || !kneeR || !trochanterR) return { value: NaN, estimated: false, available: false };
        return {
          value: 180 - angleBetweenSegments(ankleR, kneeR, trochanterR),
          estimated: ankleR.estimated || kneeR.estimated || trochanterR.estimated,
          available: true,
        };
      },
    },
  ];

  return defs.map(({ def, compute }) => {
    const r = compute();
    return result(def, r.value, r.estimated, r.available);
  });
}

export function computeMetrics(kp: KeypointMap, view: View): MetricResult[] {
  return view === "front" ? computeLeftRightMetrics(kp) : computeFrontBackMetrics(kp);
}

/**
 * Pixel -> centimeter scale factor, calibrated from the user's real height
 * and the pixel distance spanned by their detected keypoints (headTop to
 * ankle midpoint / ankleR). Requirements doc section 4.3 / section 8 flag
 * this as required for turning position-offset metrics into real-world
 * distances.
 */
export function calibratePxToCm(kp: KeypointMap, heightCm: number): number | undefined {
  const headTop = pick(kp, "headTop");
  const ankleMid = midOf(kp, "ankleL", "ankleR") ?? pick(kp, "ankleR");
  if (!headTop || !ankleMid || heightCm <= 0) return undefined;
  const pixelHeight = distance(headTop, ankleMid);
  if (pixelHeight <= 0) return undefined;
  return heightCm / pixelHeight;
}

export function metricsToCm(metrics: MetricResult[], pxToCm: number | undefined): MetricResult[] {
  if (!pxToCm) return metrics;
  return metrics.map((m) => (m.unit === "px" && m.available ? { ...m, value: Number((m.value * pxToCm).toFixed(2)), unit: "cm" } : m));
}
