import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let sharedLandmarkerPromise: Promise<PoseLandmarker> | null = null;

function getLandmarker(): Promise<PoseLandmarker> {
  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "IMAGE",
        numPoses: 1,
      })
    );
  }
  return sharedLandmarkerPromise;
}

export interface PoseDetectionResult {
  landmarks: NormalizedLandmark[];
}

export function usePoseLandmarker() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLandmarker()
      .then((l) => {
        if (cancelled) return;
        landmarkerRef.current = l;
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("姿勢推定モデルの読み込みに失敗しました。通信環境を確認してください。");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const detect = useCallback((image: HTMLImageElement): PoseDetectionResult | null => {
    const landmarker = landmarkerRef.current;
    if (!landmarker) return null;
    const result = landmarker.detect(image);
    const landmarks = result.landmarks[0];
    if (!landmarks) return null;
    return { landmarks };
  }, []);

  return { detect, loading, error };
}
