import { useState } from "react";
import KhoaHoc from "./KhoaHoc";

const TABS = [
  { id: "khoahoc", label: "Khóa học" },
  { id: "hocvien", label: "Học viên" },
  { id: "ghidanh", label: "Ghi danh" },
];

export default function TuyenSinh() {
  const [tab, setTab] = useState("khoahoc");
  return (
    <div>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? "tcnf-btn" : "tcnf-btn tcnf-btn--ghost"}
            style={{ padding: "8px 16px" }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "khoahoc" && <KhoaHoc />}
      {tab === "hocvien" && (
        <div className="tcnf-card">
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Học viên — dựng ở phần kế tiếp.
          </p>
        </div>
      )}
      {tab === "ghidanh" && (
        <div className="tcnf-card">
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Ghi danh — dựng ở phần kế tiếp.
          </p>
        </div>
      )}
    </div>
  );
}
