import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL as string;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string;

interface User {
  email: string;
  ho_ten: string;
  vaiTro: string[];
  modules: string[];
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [err, setErr] = useState("");
  const [action, setAction] = useState("dsNhanSu");
  const [payload, setPayload] = useState("{}");
  const [ketQua, setKetQua] = useState("");

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      const g = (window as any).google;
      if (!g) return;
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp: any) => {
          try {
            const r = await fetch(`${API}/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: resp.credential }),
            });
            const j = await r.json();
            if (j.ok) {
              localStorage.setItem("tcnf_token", j.data.token);
              setUser(j.data.user);
              setErr("");
            } else setErr(j.error);
          } catch (e: any) {
            setErr(String(e));
          }
        },
      });
      const el = document.getElementById("gbtn");
      if (el)
        g.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          text: "signin_with",
        });
    };
    document.body.appendChild(s);
  }, []);

  async function goiAPI() {
    setKetQua("Đang gọi…");
    const token = localStorage.getItem("tcnf_token");
    let body: any;
    try {
      body = { action, payload: JSON.parse(payload || "{}") };
    } catch {
      setKetQua("⚠ Payload không phải JSON hợp lệ");
      return;
    }
    try {
      const r = await fetch(`${API}/api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      setKetQua(JSON.stringify(await r.json(), null, 2));
    } catch (e: any) {
      setKetQua(String(e));
    }
  }

  function dangXuat() {
    localStorage.removeItem("tcnf_token");
    setUser(null);
  }

  if (!user)
    return (
      <div
        style={{
          maxWidth: 360,
          margin: "80px auto",
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <h2 style={{ color: "#2F5C8F" }}>Trạm Công Nghệ Funny</h2>
        <p style={{ color: "#555" }}>Đăng nhập bằng Google để vào hệ thống</p>
        <div id="gbtn" style={{ display: "flex", justifyContent: "center" }} />
        {err && <p style={{ color: "#c0392b" }}>{err}</p>}
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "40px auto",
        fontFamily: "Inter, sans-serif",
        padding: "0 16px",
      }}
    >
      <h2 style={{ color: "#2F5C8F", marginBottom: 4 }}>
        Xin chào {user.ho_ten}
      </h2>
      <p style={{ color: "#555", marginTop: 0 }}>
        {user.email} · vai trò: {user.vaiTro.join(", ") || "(chưa gán)"} ·
        module: {user.modules.join(", ")}
      </p>
      <button
        onClick={dangXuat}
        style={{
          background: "#eef4fb",
          color: "#2F5C8F",
          border: "none",
          borderRadius: 12,
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        Đăng xuất
      </button>

      <hr
        style={{
          margin: "20px 0",
          border: "none",
          borderTop: "1px solid #e2e8f0",
        }}
      />
      <h3 style={{ color: "#2F5C8F" }}>
        Bảng thử API (tạm — sẽ thay bằng giao diện ở GĐ7-8)
      </h3>
      <label style={{ fontSize: 13, color: "#555" }}>Action</label>
      <input
        value={action}
        onChange={(e) => setAction(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 8,
          boxSizing: "border-box",
        }}
      />
      <label style={{ fontSize: 13, color: "#555" }}>Payload (JSON)</label>
      <textarea
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        rows={5}
        style={{
          width: "100%",
          padding: 8,
          fontFamily: "monospace",
          boxSizing: "border-box",
        }}
      />
      <div style={{ marginTop: 8 }}>
        <button
          onClick={goiAPI}
          style={{
            background: "#E38B1E",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          Gọi API
        </button>
      </div>
      <pre
        style={{
          background: "#0d1117",
          color: "#c9d1d9",
          padding: 12,
          borderRadius: 8,
          marginTop: 12,
          overflow: "auto",
          maxHeight: 360,
          fontSize: 12,
        }}
      >
        {ketQua}
      </pre>
    </div>
  );
}
