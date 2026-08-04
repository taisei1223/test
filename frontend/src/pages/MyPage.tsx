import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { apiPatch, ApiError } from "../api/client";
import type { User } from "../types";

export function MyPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [heightCm, setHeightCm] = useState(user?.heightCm?.toString() ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const payload: Partial<Pick<User, "name" | "heightCm">> = {};
      if (name) payload.name = name;
      if (heightCm) payload.heightCm = Number(heightCm);
      await apiPatch("/me", payload);
      await refreshUser();
      setMessage("保存しました。");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <Layout title="マイページ">
      <div className="card">
        <h2 className="section-title">アカウント情報</h2>
        <p className="hint-text">{user?.email}</p>
      </div>

      <div className="card">
        <h2 className="section-title">プロフィール設定</h2>
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="name">お名前</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="height">身長 (cm)</label>
            <input
              id="height"
              type="number"
              min={50}
              max={250}
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="例: 165"
            />
            <p className="hint-text" style={{ marginTop: 6 }}>
              位置ずれ（左右・前後のずれ量）を実寸(cm)換算するために使用します。未入力の場合はピクセル値で表示されます。
            </p>
          </div>
          {message ? <p className="hint-text" style={{ color: "var(--color-good)" }}>{message}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "保存中..." : "保存する"}
          </button>
        </form>
      </div>

      <button className="btn btn-danger" onClick={onLogout}>
        ログアウト
      </button>
    </Layout>
  );
}
