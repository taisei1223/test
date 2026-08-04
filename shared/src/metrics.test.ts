import { describe, it, expect } from "vitest";
import { computeLeftRightMetrics, computeFrontBackMetrics } from "./metrics";
import { KeypointMap } from "./mediapipeMapping";

function pt(x: number, y: number, estimated = false) {
  return { x, y, score: 1, estimated };
}

// In a normal (non-selfie-mirrored) front photo, MediaPipe's anatomical
// "left" landmarks land on the image's right side (larger x) and "right"
// landmarks on the image's left side (smaller x) -- confirmed against a
// real detection where a level shoulder/hip line only reads near 0 deg
// with this x-ordering. Front-view test fixtures below follow it.
describe("computeLeftRightMetrics", () => {
  it("reports zero tilt for a perfectly symmetric, upright pose", () => {
    const kp: KeypointMap = {
      headTop: pt(100, 0),
      neckMid: pt(100, 50),
      shoulderL: pt(120, 60),
      shoulderR: pt(80, 60),
      wristL: pt(130, 150),
      wristR: pt(70, 150),
      trochanterL: pt(110, 200),
      trochanterR: pt(90, 200),
      ankleL: pt(110, 380),
      ankleR: pt(90, 380),
    };
    const metrics = computeLeftRightMetrics(kp);
    const byKey = Object.fromEntries(metrics.map((m) => [m.key, m]));
    expect(byKey.shoulderLR.value).toBeCloseTo(0, 1);
    expect(byKey.hipLR.value).toBeCloseTo(0, 1);
    expect(byKey.headLR.value).toBeCloseTo(0, 1);
    expect(byKey.wholeBodyLR.value).toBeCloseTo(0, 1);
  });

  it("detects a drooping right shoulder as a small angle, not a ~180deg flip", () => {
    const kp: KeypointMap = {
      shoulderL: pt(120, 60),
      shoulderR: pt(80, 80), // right shoulder (smaller x) sits lower (larger y)
    };
    const metrics = computeLeftRightMetrics(kp);
    const shoulderLR = metrics.find((m) => m.key === "shoulderLR")!;
    expect(Math.abs(shoulderLR.value)).toBeLessThan(45);
    expect(shoulderLR.value).not.toBeCloseTo(180, 0);
  });

  it("marks a metric unavailable when required points are missing", () => {
    const kp: KeypointMap = { shoulderL: pt(80, 60) };
    const metrics = computeLeftRightMetrics(kp);
    const shoulderLR = metrics.find((m) => m.key === "shoulderLR")!;
    expect(shoulderLR.available).toBe(false);
    expect(Number.isNaN(shoulderLR.value)).toBe(true);
  });
});

describe("computeFrontBackMetrics", () => {
  it("reads ~0deg for a straight leg (deviation-from-straight convention)", () => {
    const kp: KeypointMap = {
      ankleR: pt(100, 380),
      kneeR: pt(100, 200),
      trochanterR: pt(100, 20),
    };
    const metrics = computeFrontBackMetrics(kp);
    const knee = metrics.find((m) => m.key === "kneeFlexion")!;
    expect(knee.value).toBeCloseTo(0, 0);
  });

  it("computes a 90deg knee bend", () => {
    const kp: KeypointMap = {
      ankleR: pt(100, 200),
      kneeR: pt(100, 100),
      trochanterR: pt(200, 100),
    };
    const metrics = computeFrontBackMetrics(kp);
    const knee = metrics.find((m) => m.key === "kneeFlexion")!;
    expect(knee.value).toBeCloseTo(90, 0);
  });

  it("propagates the estimated flag from special landmarks", () => {
    const kp: KeypointMap = {
      asisR: pt(120, 200, true),
      psisR: pt(80, 205, true),
      eyeR: pt(120, 50),
      earR: pt(80, 50),
    };
    const metrics = computeFrontBackMetrics(kp);
    const pelvis = metrics.find((m) => m.key === "pelvisFB")!;
    expect(pelvis.estimated).toBe(true);
  });

  it("reads a level pelvis as ~0deg regardless of which way the subject faces in frame", () => {
    // Facing right: eye at larger x than ear, ASIS (front) at larger x than PSIS (back).
    const facingRight: KeypointMap = {
      eyeR: pt(120, 50),
      earR: pt(80, 50),
      asisR: pt(120, 200),
      psisR: pt(80, 202), // nearly level
    };
    // Facing left: mirrored -- eye at smaller x than ear, ASIS at smaller x than PSIS.
    const facingLeft: KeypointMap = {
      eyeR: pt(80, 50),
      earR: pt(120, 50),
      asisR: pt(80, 200),
      psisR: pt(120, 202),
    };
    const rightResult = computeFrontBackMetrics(facingRight).find((m) => m.key === "pelvisFB")!;
    const leftResult = computeFrontBackMetrics(facingLeft).find((m) => m.key === "pelvisFB")!;
    expect(Math.abs(rightResult.value)).toBeLessThan(10);
    expect(Math.abs(leftResult.value)).toBeLessThan(10);
  });

  it("reads a level ear-eye line as ~0deg regardless of facing direction", () => {
    const facingRight: KeypointMap = { earR: pt(80, 100), eyeR: pt(120, 102) };
    const facingLeft: KeypointMap = { earR: pt(120, 100), eyeR: pt(80, 102) };
    const rightResult = computeFrontBackMetrics(facingRight).find((m) => m.key === "headFB")!;
    const leftResult = computeFrontBackMetrics(facingLeft).find((m) => m.key === "headFB")!;
    expect(Math.abs(rightResult.value)).toBeLessThan(10);
    expect(Math.abs(leftResult.value)).toBeLessThan(10);
  });
});
