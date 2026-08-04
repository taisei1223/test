import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/capture");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ログインに失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="center-page">
      <div className="card" style={{ width: "100%", maxWidth: 360, textAlign: "left" }}>
        <h2 style={{ marginTop: 0 }}>姿勢分析アプリ</h2>
        <p className="hint-text">ログインして撮影を始めましょう。</p>
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="email">メールアドレス</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-field">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        <p className="hint-text" style={{ marginTop: 16, textAlign: "center" }}>
          アカウントをお持ちでないですか？ <Link to="/register">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
