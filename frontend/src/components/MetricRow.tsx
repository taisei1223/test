import type { MetricResult } from "@posture/shared";

function severity(m: MetricResult): "good" | "warn" | "bad" {
  const abs = Math.abs(m.value);
  if (abs <= m.referenceBand) return "good";
  if (abs <= m.referenceBand * 2) return "warn";
  return "bad";
}

const UNIT_LABEL: Record<string, string> = { deg: "°", px: "px", cm: "cm" };

export function MetricRow({ metric }: { metric: MetricResult }) {
  if (!metric.available) {
    return (
      <div className="metric-row">
        <span className="metric-label">{metric.label}</span>
        <span className="metric-value hint-text">検出不可</span>
      </div>
    );
  }

  const sev = severity(metric);
  const color = sev === "good" ? "var(--color-good)" : sev === "warn" ? "var(--color-warn)" : "var(--color-bad)";
  const barPct = Math.min(100, (Math.abs(metric.value) / (metric.referenceBand * 3)) * 100);

  return (
    <div className="metric-row">
      <span className="metric-label">
        {metric.label}
        {metric.estimated ? <span className="estimated-badge">参考値</span> : null}
      </span>
      <div className="metric-bar-track">
        <div className="metric-bar-fill" style={{ width: `${barPct}%`, background: color }} />
      </div>
      <span className={`metric-value badge-${sev}`}>
        {metric.value > 0 ? "+" : ""}
        {metric.value}
        {UNIT_LABEL[metric.unit] ?? metric.unit}
      </span>
    </div>
  );
}
