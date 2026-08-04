import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "@posture/shared";

interface Props {
  view: View;
  onCaptured: (file: File) => void;
}

const GUIDE_COPY: Record<View, string> = {
  front: "正面を向き、頭からつま先まで枠内に収まるように立ってください。",
  side: "体の右側をカメラに向け、まっすぐ横向きに立ってください。",
};

export function CameraCapture({ view, onCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setCameraError(null);
    stopStream();

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("このブラウザはカメラ撮影に対応していません。画像をアップロードしてください。");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setCameraError("カメラを起動できませんでした。画像をアップロードしてください。");
      }
    }
    start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facing, stopStream]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCaptured(new File([blob], `${view}-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onCaptured(file);
    e.target.value = "";
  }

  return (
    <div>
      <p className="hint-text" style={{ marginBottom: 10 }}>{GUIDE_COPY[view]}</p>
      <div className="capture-frame">
        {!cameraError ? (
          <>
            <video ref={videoRef} playsInline muted autoPlay />
            <svg className="capture-guide-overlay" viewBox="0 0 300 400" preserveAspectRatio="none">
              <line x1="150" y1="0" x2="150" y2="400" stroke="#22e07a" strokeWidth="1.5" strokeDasharray="6 6" />
              <rect x="70" y="15" width="160" height="370" rx="12" fill="none" stroke="#22e07a" strokeWidth="1.5" strokeDasharray="4 6" />
            </svg>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#fff", padding: 20, textAlign: "center" }}>
            {cameraError}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {!cameraError ? (
          <>
            <button className="btn btn-primary" onClick={capture} disabled={!ready}>
              📸 撮影する
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: "auto", padding: "12px 14px" }}
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              aria-label="カメラ切り替え"
            >
              🔄
            </button>
          </>
        ) : null}
        <button className="btn btn-secondary" style={{ width: cameraError ? "100%" : "auto", padding: "12px 14px" }} onClick={() => fileInputRef.current?.click()}>
          🖼️ アルバムから選択
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: "none" }}
          onChange={onFileSelected}
        />
      </div>
    </div>
  );
}
