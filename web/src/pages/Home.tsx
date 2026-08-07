import { Link } from "react-router-dom";
import { useAuth } from "../auth/auth";
import { MODULES } from "../lib/modules";

export default function Home() {
  const { user } = useAuth();
  const items = MODULES.filter((m) => user?.modules.includes(m.id));
  return (
    <div>
      <div className="tcnf-card" style={{ marginBottom: 16 }}>
        <h2 style={{ color: "var(--navy)", marginTop: 0, marginBottom: 6 }}>
          Xin chào {user?.ho_ten} 👋
        </h2>
        <p style={{ color: "var(--ink-soft)", margin: 0 }}>
          Vai trò: {user?.vaiTro.join(", ")}
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
          gap: 12,
        }}
      >
        {items.map((m) => (
          <Link
            key={m.id}
            to={m.path}
            className="tcnf-card"
            style={{
              textDecoration: "none",
              color: "var(--ink)",
              display: "block",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--navy)" }}>
              {m.label}
            </div>
            <div
              style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}
            >
              Mở {m.label.toLowerCase()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
