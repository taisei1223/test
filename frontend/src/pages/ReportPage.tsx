import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { KeypointEditor } from "../components/KeypointEditor";
import { MetricRow } from "../components/MetricRow";
import { apiGet, fetchImageObjectUrl } from "../api/client";
import type { Measurement } from "../types";

const VIEW_LABEL: Record<string, string> = { front: "正面", side: "側面" };

export function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const stateIds = (location.state as { measurementIds?: string[] } | null)?.measurementIds;
        let list: Measurement[];
        if (stateIds && stateIds.length > 0) {
          list = await apiGet<Measurement[]>(`/measurements/compare/batch?ids=${stateIds.join(",")}`);
        } else {
          const all = await apiGet<Measurement[]>("/measurements");
          list = all.filter((m) => m.sessionId === sessionId);
        }
        if (cancelled) return;
        setMeasurements(list);

        const urls: Record<string, string> = {};
        for (const m of list) {
          urls[m.id] = await fetchImageObjectUrl(m.imageId);
        }
        if (!cancelled) setImageUrls(urls);
      } catch {
        if (!cancelled) setError("結果の取得に失敗しました。");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (error) {
    return (
      <Layout title="解析結果" back>
        <p className="error-text">{error}</p>
      </Layout>
    );
  }

  if (!measurements) {
    return (
      <Layout title="解析結果" back>
        <div className="center-page" style={{ minHeight: 240 }}>
          <div className="spinner" />
          <p className="hint-text">結果を読み込んでいます...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="解析結果" back>
      <div className="disclaimer" style={{ marginBottom: 16 }}>
        この結果は姿勢の傾向を把握するための目安です。医療的な診断を目的としたものではありません。
      </div>

      {measurements.map((m) => {
        const url = imageUrls[m.id];
        return (
          <div key={m.id} className="card">
            <h2 className="section-title">{VIEW_LABEL[m.view] ?? m.view}からの計測</h2>
            {url ? (
              <div style={{ maxWidth: 260, margin: "0 auto 14px" }}>
                <KeypointEditor
                  imageUrl={url}
                  naturalWidth={m.imageWidth}
                  naturalHeight={m.imageHeight}
                  view={m.view}
                  keypoints={m.keypoints}
                  readOnly
                />
              </div>
            ) : null}
            <div>
              {m.metrics.map((metric) => (
                <MetricRow key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        );
      })}

      <button className="btn btn-primary" onClick={() => navigate("/capture")} style={{ marginTop: 4 }}>
        新しく撮影する
      </button>
      <button className="btn btn-ghost" onClick={() => navigate("/history")} style={{ marginTop: 10 }}>
        履歴を見る
      </button>
    </Layout>
  );
}
