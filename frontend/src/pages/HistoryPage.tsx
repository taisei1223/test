import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiGet } from "../api/client";
import type { Measurement } from "../types";

interface SessionGroup {
  sessionId: string;
  createdAt: string;
  views: string[];
  measurementIds: string[];
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiGet<Measurement[]>("/measurements")
      .then(setMeasurements)
      .catch(() => setError("履歴の取得に失敗しました。"));
  }, []);

  const groups: SessionGroup[] = useMemo(() => {
    if (!measurements) return [];
    const map = new Map<string, SessionGroup>();
    for (const m of measurements) {
      const key = m.sessionId ?? m.id;
      const existing = map.get(key);
      if (existing) {
        existing.views.push(m.view);
        existing.measurementIds.push(m.id);
        if (m.createdAt < existing.createdAt) existing.createdAt = m.createdAt;
      } else {
        map.set(key, { sessionId: key, createdAt: m.createdAt, views: [m.view], measurementIds: [m.id] });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [measurements]);

  function toggle(sessionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function compareSelected() {
    const ids = groups
      .filter((g) => selected.has(g.sessionId))
      .flatMap((g) => g.measurementIds);
    if (ids.length < 2) return;
    navigate(`/compare?ids=${ids.join(",")}`);
  }

  return (
    <Layout title="測定履歴">
      {error ? <p className="error-text">{error}</p> : null}
      {!measurements ? (
        <div className="center-page" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      ) : groups.length === 0 ? (
        <div className="card">
          <p className="hint-text">まだ測定履歴がありません。撮影して最初の姿勢分析を行いましょう。</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="section-title">履歴を2件以上選択すると経過を比較できます</h2>
            {groups.map((g) => (
              <label key={g.sessionId} className="history-item" style={{ cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" checked={selected.has(g.sessionId)} onChange={() => toggle(g.sessionId)} />
                  <span>
                    <div>{new Date(g.createdAt).toLocaleString("ja-JP")}</div>
                    <div style={{ marginTop: 4 }}>
                      {g.views.map((v) => (
                        <span key={v} className="pill" style={{ marginRight: 4 }}>
                          {v === "front" ? "正面" : "側面"}
                        </span>
                      ))}
                    </div>
                  </span>
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ width: "auto", padding: "6px 10px" }}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/report/${g.sessionId}`, { state: { measurementIds: g.measurementIds } });
                  }}
                >
                  詳細
                </button>
              </label>
            ))}
          </div>
          <button className="btn btn-primary" disabled={selected.size < 2} onClick={compareSelected}>
            選択した{selected.size}件を比較する
          </button>
        </>
      )}
    </Layout>
  );
}
