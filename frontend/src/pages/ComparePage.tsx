import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiGet } from "../api/client";
import type { Measurement } from "../types";
import type { View } from "@posture/shared";

const VIEW_LABEL: Record<View, string> = { front: "正面", side: "側面" };
const UNIT_LABEL: Record<string, string> = { deg: "°", px: "px", cm: "cm" };

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = searchParams.get("ids") ?? "";

  useEffect(() => {
    if (!ids) return;
    apiGet<Measurement[]>(`/measurements/compare/batch?ids=${ids}`)
      .then(setMeasurements)
      .catch(() => setError("比較データの取得に失敗しました。"));
  }, [ids]);

  if (error) {
    return (
      <Layout title="経過比較" back>
        <p className="error-text">{error}</p>
      </Layout>
    );
  }

  if (!measurements) {
    return (
      <Layout title="経過比較" back>
        <div className="center-page" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  const views: View[] = ["front", "side"];

  return (
    <Layout title="経過比較" back>
      <div className="disclaimer" style={{ marginBottom: 16 }}>
        数値は過去の測定と現在の測定を並べたものです。撮影条件のばらつきにより誤差が生じる場合があります。
      </div>
      {views.map((view) => {
        const rows = measurements.filter((m) => m.view === view).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
        if (rows.length === 0) return null;
        const metricKeys = rows[0].metrics.map((m) => ({ key: m.key, label: m.label }));
        return (
          <div key={view} className="card" style={{ overflowX: "auto" }}>
            <h2 className="section-title">{VIEW_LABEL[view]}</h2>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>項目</th>
                  {rows.map((r) => (
                    <th key={r.id} style={{ textAlign: "right", padding: "6px 8px", whiteSpace: "nowrap" }}>
                      {new Date(r.createdAt).toLocaleDateString("ja-JP")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricKeys.map(({ key, label }) => (
                  <tr key={key} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "6px 8px" }}>{label}</td>
                    {rows.map((r) => {
                      const metric = r.metrics.find((m) => m.key === key);
                      return (
                        <td key={r.id} style={{ padding: "6px 8px", textAlign: "right" }}>
                          {metric?.available
                            ? `${metric.value > 0 ? "+" : ""}${metric.value}${UNIT_LABEL[metric.unit] ?? ""}`
                            : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </Layout>
  );
}
