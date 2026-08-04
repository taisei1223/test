import { useRef, useState } from "react";
import {
  keypointsForView,
  SKELETON_EDGES_FRONT,
  SKELETON_EDGES_SIDE,
  type View,
  type KeypointMap,
  type KeypointName,
} from "@posture/shared";

interface Props {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  view: View;
  keypoints: KeypointMap;
  onChange?: (next: KeypointMap) => void;
  readOnly?: boolean;
}

export function KeypointEditor({ imageUrl, naturalWidth, naturalHeight, view, keypoints, onChange, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingKey, setDraggingKey] = useState<KeypointName | null>(null);
  const edges = view === "front" ? SKELETON_EDGES_FRONT : SKELETON_EDGES_SIDE;
  const defs = keypointsForView(view);

  function clientToImageCoords(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * naturalWidth;
    const y = ((clientY - rect.top) / rect.height) * naturalHeight;
    return {
      x: Math.min(Math.max(x, 0), naturalWidth),
      y: Math.min(Math.max(y, 0), naturalHeight),
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingKey || readOnly || !onChange) return;
    const coords = clientToImageCoords(e.clientX, e.clientY);
    if (!coords) return;
    const current = keypoints[draggingKey];
    onChange({
      ...keypoints,
      [draggingKey]: { x: coords.x, y: coords.y, score: current?.score ?? 1, estimated: false },
    });
  }

  function handlePointerUp() {
    setDraggingKey(null);
  }

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${naturalWidth} / ${naturalHeight}`,
          borderRadius: 12,
          overflow: "hidden",
          background: "#11141a",
          touchAction: "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img src={imageUrl} draggable={false} style={{ width: "100%", height: "100%", display: "block", objectFit: "fill" }} alt="" />
        <svg
          viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {edges.map(([a, b]) => {
            const pa = keypoints[a];
            const pb = keypoints[b];
            if (!pa || !pb) return null;
            return <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#22e07a" strokeWidth={Math.max(naturalWidth * 0.004, 2)} />;
          })}
          {defs.map((def) => {
            const p = keypoints[def.name];
            if (!p) return null;
            const r = Math.max(naturalWidth * 0.012, 8);
            return (
              <circle
                key={def.name}
                cx={p.x}
                cy={p.y}
                r={r}
                fill={p.estimated ? "#f5a623" : "#2f6fed"}
                stroke="#fff"
                strokeWidth={Math.max(naturalWidth * 0.002, 1.5)}
                onPointerDown={
                  readOnly
                    ? undefined
                    : (e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDraggingKey(def.name);
                      }
                }
                style={{ cursor: readOnly ? "default" : "grab" }}
              />
            );
          })}
        </svg>
      </div>
      {!readOnly ? (
        <p className="hint-text" style={{ marginTop: 10 }}>
          点をドラッグしてズレを補正できます。<span style={{ color: "#f5a623" }}>橙色</span>
          の点は自動推定できないランドマークの近似値です。
        </p>
      ) : null}
    </div>
  );
}
