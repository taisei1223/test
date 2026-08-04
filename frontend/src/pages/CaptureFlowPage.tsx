import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { CameraCapture } from "../components/CameraCapture";
import { KeypointEditor } from "../components/KeypointEditor";
import { usePoseLandmarker } from "../pose/usePoseLandmarker";
import { mapMediapipeLandmarks, defaultKeypoints, type KeypointMap, type View } from "@posture/shared";
import { apiUpload, apiPost } from "../api/client";
import type { UploadedImage, Measurement } from "../types";

type Step = "capture" | "detecting" | "adjust" | "saving";

const VIEW_ORDER: View[] = ["front", "side"];
const VIEW_LABEL: Record<View, string> = { front: "正面", side: "側面" };

export function CaptureFlowPage() {
  const navigate = useNavigate();
  const { detect, loading: modelLoading, error: modelError } = usePoseLandmarker();
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const [viewIndex, setViewIndex] = useState(0);
  const [step, setStep] = useState<Step>("capture");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [keypoints, setKeypoints] = useState<KeypointMap>({});
  const [error, setError] = useState<string | null>(null);
  const [detectionWarning, setDetectionWarning] = useState<string | null>(null);
  const [measurementIds, setMeasurementIds] = useState<string[]>([]);

  const view = VIEW_ORDER[viewIndex];

  const handleCaptured = useCallback(
    (capturedFile: File) => {
      setError(null);
      setDetectionWarning(null);
      setFile(capturedFile);
      const url = URL.createObjectURL(capturedFile);
      setImageUrl(url);
      setStep("detecting");

      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        if (modelLoading || modelError) {
          setDetectionWarning("自動検出が利用できないため、点をすべて手動で配置してください。");
          setKeypoints(defaultKeypoints(view, img.naturalWidth, img.naturalHeight));
          setStep("adjust");
          return;
        }
        const result = detect(img);
        if (!result) {
          setDetectionWarning("人物を自動検出できませんでした。点をドラッグして手動で配置してください。");
          setKeypoints(defaultKeypoints(view, img.naturalWidth, img.naturalHeight));
          setStep("adjust");
          return;
        }
        const mapped = mapMediapipeLandmarks(result.landmarks, img.naturalWidth, img.naturalHeight, view, "right");
        setKeypoints(mapped);
        setStep("adjust");
      };
      img.onerror = () => {
        setDetectionWarning("画像を読み込めませんでした。点をドラッグして手動で配置してください。");
        setKeypoints({});
        setStep("adjust");
      };
      img.src = url;
    },
    [detect, modelLoading, modelError, view]
  );

  async function handleConfirm() {
    if (!file) return;
    setStep("saving");
    setError(null);
    try {
      const form = new FormData();
      form.append("view", view);
      form.append("image", file);
      const uploaded = await apiUpload<UploadedImage>("/images", form);

      const measurement = await apiPost<Measurement>("/measurements", {
        imageId: uploaded.id,
        view,
        keypoints,
        sessionId: sessionIdRef.current,
      });

      const nextIds = [...measurementIds, measurement.id];
      setMeasurementIds(nextIds);

      if (viewIndex < VIEW_ORDER.length - 1) {
        setViewIndex((i) => i + 1);
        setStep("capture");
        setImageUrl(null);
        setImageEl(null);
        setFile(null);
        setKeypoints({});
        setDetectionWarning(null);
      } else {
        navigate(`/report/${sessionIdRef.current}`, { state: { measurementIds: nextIds } });
      }
    } catch {
      setError("保存に失敗しました。通信環境を確認してもう一度お試しください。");
      setStep("adjust");
    }
  }

  function retake() {
    setImageUrl(null);
    setImageEl(null);
    setFile(null);
    setKeypoints({});
    setError(null);
    setDetectionWarning(null);
    setStep("capture");
  }

  return (
    <Layout title={`撮影 (${VIEW_LABEL[view]})`}>
      <div className="disclaimer" style={{ marginBottom: 16 }}>
        本アプリの解析結果は姿勢の目安であり、医療診断ではありません。第七頚椎・大転子・腸骨棘は自動検出できないため近似値です。
      </div>

      <div className="view-toggle">
        {VIEW_ORDER.map((v, i) => (
          <button key={v} className={i === viewIndex ? "active" : ""} disabled>
            {i < viewIndex ? "✓ " : ""}
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      {step === "capture" ? <CameraCapture view={view} onCaptured={handleCaptured} /> : null}

      {step === "detecting" ? (
        <div className="center-page" style={{ minHeight: 240 }}>
          <div className="spinner" />
          <p className="hint-text">{modelLoading ? "姿勢推定モデルを読み込み中..." : "骨格キーポイントを検出しています..."}</p>
        </div>
      ) : null}

      {(step === "adjust" || step === "saving") && imageUrl && imageEl ? (
        <>
          {detectionWarning ? <p className="error-text">{detectionWarning}</p> : null}
          <KeypointEditor
            imageUrl={imageUrl}
            naturalWidth={imageEl.naturalWidth}
            naturalHeight={imageEl.naturalHeight}
            view={view}
            keypoints={keypoints}
            onChange={setKeypoints}
          />
          {error ? <p className="error-text">{error}</p> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost" onClick={retake} disabled={step === "saving"}>
              撮り直す
            </button>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={step === "saving"}>
              {step === "saving" ? "保存中..." : "この内容で解析する"}
            </button>
          </div>
        </>
      ) : null}
    </Layout>
  );
}
