import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export function Layout({ title, children, back }: { title: string; children: ReactNode; back?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <div className="top-bar">
        {back ? (
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="戻る">
            ←
          </button>
        ) : null}
        <h1>{title}</h1>
      </div>
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const items = [
    { to: "/capture", label: "撮影", icon: "📷" },
    { to: "/history", label: "履歴", icon: "🕘" },
    { to: "/mypage", label: "マイページ", icon: "👤" },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
