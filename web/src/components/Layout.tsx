import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/auth";
import { MODULES } from "../lib/modules";
import "./Layout.css";

export default function Layout() {
  const { user, dangXuat } = useAuth();
  const [open, setOpen] = useState(false);
  const items = MODULES.filter((m) => user?.modules.includes(m.id));

  return (
    <div className="tcnf-shell">
      <header
        className="tcnf-topbar"
        style={{ height: 56, boxSizing: "border-box" }}
      >
        <button className="tcnf-burger" onClick={() => setOpen(!open)}>
          ☰
        </button>
        <img
          src="/logo.png"
          alt=""
          style={{ height: 30 }}
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
        <div style={{ fontWeight: 600 }}>Trạm Công Nghệ Funny</div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
          }}
        >
          <span style={{ opacity: 0.9 }}>{user?.ho_ten}</span>
          <button
            className="tcnf-btn tcnf-btn--ghost"
            style={{ padding: "6px 12px" }}
            onClick={dangXuat}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="tcnf-body">
        <div
          className={"tcnf-overlay" + (open ? " show" : "")}
          onClick={() => setOpen(false)}
        />
        <nav
          className={"tcnf-side" + (open ? " open" : "")}
          onClick={() => setOpen(false)}
        >
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          {items.map((m) => (
            <NavLink key={m.id} to={m.path}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="tcnf-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
