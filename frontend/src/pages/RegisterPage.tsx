import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../api/client";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, name);
      navigate("/capture");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="center-page">
      <div className="card" style={{ width: "100%", maxWidth: 360, textAlign: "left" }}>
        <h2 style={{ marginTop: 0 }}>会員登録</h2>
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="name">お名前</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="form-field">
            <label htmlFor="email">メールアドレス</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-field">
            <label htmlFor="password">パスワード（8文字以上）</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "登録中..." : "登録する"}
          </button>
        </form>
        <p className="hint-text" style={{ marginTop: 16, textAlign: "center" }}>
          既にアカウントをお持ちですか？ <Link to="/login">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
