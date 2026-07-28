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

  async function goiThu() {
    const token = localStorage.getItem("tcnf_token");
    const r = await fetch(`${API}/api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "dsKhoaHoc" }),
    });
    alert(JSON.stringify(await r.json(), null, 2));
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
        maxWidth: 520,
        margin: "60px auto",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h2 style={{ color: "#2F5C8F" }}>Xin chào {user.ho_ten}</h2>
      <p>Email: {user.email}</p>
      <p>Vai trò: {user.vaiTro.join(", ") || "(chưa gán)"}</p>
      <p>Module: {user.modules.join(", ") || "(không)"}</p>
      <button
        onClick={goiThu}
        style={{
          background: "#E38B1E",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "10px 16px",
          cursor: "pointer",
        }}
      >
        Gọi thử dsKhoaHoc
      </button>{" "}
      <button
        onClick={dangXuat}
        style={{
          background: "#eef4fb",
          color: "#2F5C8F",
          border: "none",
          borderRadius: 12,
          padding: "10px 16px",
          cursor: "pointer",
        }}
      >
        Đăng xuất
      </button>
    </div>
  );
}
