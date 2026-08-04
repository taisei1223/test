import { describe, it, expect } from "vitest";
import { computeLeftRightMetrics, computeFrontBackMetrics } from "./metrics";
import { KeypointMap } from "./mediapipeMapping";

function pt(x: number, y: number, estimated = false) {
  return { x, y, score: 1, estimated };
}

describe("computeLeftRightMetrics", () => {
  it("reports zero tilt for a perfectly symmetric, upright pose", () => {
    const kp: KeypointMap = {
      headTop: pt(100, 0),
      neckMid: pt(100, 50),
      shoulderL: pt(80, 60),
      shoulderR: pt(120, 60),
      wristL: pt(70, 150),
      wristR: pt(130, 150),
      trochanterL: pt(90, 200),
      trochanterR: pt(110, 200),
      ankleL: pt(90, 380),
      ankleR: pt(110, 380),
    };
    const metrics = computeLeftRightMetrics(kp);
    const byKey = Object.fromEntries(metrics.map((m) => [m.key, m]));
    expect(byKey.shoulderLR.value).toBeCloseTo(0, 1);
    expect(byKey.hipLR.value).toBeCloseTo(0, 1);
    expect(byKey.headLR.value).toBeCloseTo(0, 1);
    expect(byKey.wholeBodyLR.value).toBeCloseTo(0, 1);
  });

  it("detects a right-tilted shoulder line", () => {
    const kp: KeypointMap = {
      shoulderL: pt(80, 60),
      shoulderR: pt(120, 80), // lower on the right => right shoulder drops
    };
    const metrics = computeLeftRightMetrics(kp);
    const shoulderLR = metrics.find((m) => m.key === "shoulderLR")!;
    expect(shoulderLR.value).toBeGreaterThan(0);
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
  it("computes knee flexion angle as ~180deg for a straight leg", () => {
    const kp: KeypointMap = {
      ankleR: pt(100, 380),
      kneeR: pt(100, 200),
      trochanterR: pt(100, 20),
    };
    const metrics = computeFrontBackMetrics(kp);
    const knee = metrics.find((m) => m.key === "kneeFlexion")!;
    expect(knee.value).toBeCloseTo(180, 0);
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
    };
    const metrics = computeFrontBackMetrics(kp);
    const pelvis = metrics.find((m) => m.key === "pelvisFB")!;
    expect(pelvis.estimated).toBe(true);
  });
});
