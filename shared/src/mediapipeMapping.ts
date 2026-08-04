import type { KeypointName, View } from "./keypoints";

export interface Point2D {
  x: number;
  y: number;
  /** 0..1 detection confidence. Derived/estimated points get a discounted score. */
  score: number;
  /** True when this point was not a direct model output but geometrically approximated. */
  estimated: boolean;
}

export type KeypointMap = Partial<Record<KeypointName, Point2D>>;

/** A single MediaPipe Pose landmark, normalized to [0,1] on the input image. */
export interface MediapipeLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** Index of each landmark in the 33-point MediaPipe Pose output. */
export const MP_INDEX = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

function mid(a: Point2D, b: Point2D, estimated = false): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    score: Math.min(a.score, b.score),
    estimated: estimated || a.estimated || b.estimated,
  };
}

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function toPoint(lm: MediapipeLandmark, w: number, h: number, estimated = false): Point2D {
  return { x: lm.x * w, y: lm.y * h, score: lm.visibility ?? 1, estimated };
}

/**
 * Maps the 33 standard MediaPipe Pose landmarks onto the 19 anatomical
 * keypoints defined in the requirements doc (section 3.1).
 *
 * Points flagged `estimated: true` are NOT direct model outputs. MediaPipe
 * (and OpenPose) have no standard landmark for headTop, the greater
 * trochanters, C7, or the ASIS/PSIS pelvic landmarks — this is the exact
 * gap the requirements doc calls out in sections 4.2 and 8. This mapping
 * approximates them geometrically from nearby standard landmarks so the
 * Phase 1 pipeline (see doc section 9) can still compute every metric in
 * section 3, at reduced accuracy for the estimated points. Replacing these
 * heuristics with a fine-tuned model (4.2.1) or 3D mesh recovery (4.2.2) is
 * future work, not implemented here.
 *
 * `facing` tells us which way the subject faces in a side-view photo, which
 * is required to tell front-of-pelvis (ASIS) from back-of-pelvis (PSIS) —
 * see the capture guide copy in the frontend for the convention shown to
 * the user ("体の右側を向けて、まっすぐ立ってください" -> facing "right").
 */
export function mapMediapipeLandmarks(
  landmarks: MediapipeLandmark[],
  imageWidth: number,
  imageHeight: number,
  view: View,
  facing: "left" | "right" = "right"
): KeypointMap {
  const p = (idx: number, estimated = false) => toPoint(landmarks[idx], imageWidth, imageHeight, estimated);

  const leftShoulder = p(MP_INDEX.leftShoulder);
  const rightShoulder = p(MP_INDEX.rightShoulder);
  const leftHip = p(MP_INDEX.leftHip);
  const rightHip = p(MP_INDEX.rightHip);
  const leftEar = p(MP_INDEX.leftEar);
  const rightEar = p(MP_INDEX.rightEar);
  const rightEye = p(MP_INDEX.rightEye);

  const neckMid = mid(leftShoulder, rightShoulder);
  const earMid = mid(leftEar, rightEar);
  const headHeightEstimate = Math.max(dist(earMid, neckMid) * 0.5, 1e-3);
  const headTop: Point2D = {
    x: earMid.x,
    y: earMid.y - headHeightEstimate,
    score: earMid.score * 0.6,
    estimated: true,
  };

  const out: KeypointMap = {
    neckMid,
    headTop,
    shoulderL: leftShoulder,
    shoulderR: rightShoulder,
    elbowL: p(MP_INDEX.leftElbow),
    elbowR: p(MP_INDEX.rightElbow),
    wristL: p(MP_INDEX.leftWrist),
    wristR: p(MP_INDEX.rightWrist),
    // Greater trochanter has no standard landmark; the hip landmark is the
    // nearest available proxy and is used as-is with a discounted score.
    trochanterL: { ...leftHip, score: leftHip.score * 0.7, estimated: true },
    trochanterR: { ...rightHip, score: rightHip.score * 0.7, estimated: true },
    kneeL: p(MP_INDEX.leftKnee),
    kneeR: p(MP_INDEX.rightKnee),
    ankleL: p(MP_INDEX.leftAnkle),
    ankleR: p(MP_INDEX.rightAnkle),
  };

  if (view === "side") {
    const shoulderR = rightShoulder;
    const hipR = rightHip;
    const earR = rightEar;

    // C7 (7th cervical vertebra / base of neck): placed a short distance
    // from the shoulder toward the ear along the neck line.
    const c7: Point2D = {
      x: shoulderR.x + (earR.x - shoulderR.x) * 0.15,
      y: shoulderR.y - (shoulderR.y - earR.y) * 0.15,
      score: shoulderR.score * 0.6,
      estimated: true,
    };

    const torsoDepthProxy = dist(shoulderR, hipR) * 0.25;
    const dir = facing === "right" ? 1 : -1;
    const asisR: Point2D = {
      x: hipR.x + dir * torsoDepthProxy * 0.5,
      y: hipR.y - torsoDepthProxy * 0.1,
      score: hipR.score * 0.5,
      estimated: true,
    };
    const psisR: Point2D = {
      x: hipR.x - dir * torsoDepthProxy * 0.5,
      y: hipR.y - torsoDepthProxy * 0.05,
      score: hipR.score * 0.5,
      estimated: true,
    };

    out.eyeR = rightEye;
    out.earR = earR;
    out.c7 = c7;
    out.asisR = asisR;
    out.psisR = psisR;
  }

  return out;
}
