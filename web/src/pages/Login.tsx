import { useState } from "react";
import GoogleButton from "../auth/GoogleButton";

export default function Login() {
  const [err, setErr] = useState("");
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
      }}
    >
      <div className="tcnf-card" style={{ width: 340, textAlign: "center" }}>
        <img
          src="/logo.png"
          alt="TCNF"
          style={{ height: 56, marginBottom: 8 }}
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
        <h2 style={{ color: "var(--navy)", margin: "4px 0" }}>
          Trạm Công Nghệ Funny
        </h2>
        <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
          Hệ thống quản lý nội bộ
        </p>
        <div style={{ marginTop: 16 }}>
          <GoogleButton onError={setErr} />
        </div>
        {err && <p style={{ color: "var(--danger)", marginTop: 12 }}>{err}</p>}
      </div>
    </div>
  );
}
