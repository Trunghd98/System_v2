import { useEffect, useState } from "react";
import { goiAPI } from "../../lib/api";
import { Modal, Field, inputStyle, Btn } from "../../components/ui";

export default function ChamSoc({
  hv,
  onClose,
}: {
  hv: any;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noiDung, setNoiDung] = useState("");
  const [giaiDoan, setGiaiDoan] = useState("tư_vấn");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function tai() {
    setLoading(true);
    try {
      setRows(await goiAPI("dsChamSoc", { ma_dinh_danh: hv.ma_dinh_danh }));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    tai();
  }, []);

  async function them() {
    if (!noiDung.trim()) {
      setErr("Nhập nội dung chăm sóc");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await goiAPI("themChamSoc", {
        ma_dinh_danh: hv.ma_dinh_danh,
        noi_dung: noiDung,
        giai_doan: giaiDoan,
      });
      setNoiDung("");
      await tai();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Chăm sóc · ${hv.ho_ten_hv} (${hv.ma_dinh_danh})`}
      onClose={onClose}
    >
      <div style={{ marginBottom: 12 }}>
        <Field label="Nội dung chăm sóc">
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            placeholder="VD: Gọi tư vấn, phụ huynh quan tâm khóa Web…"
          />
        </Field>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field label="Giai đoạn">
              <input
                style={inputStyle}
                value={giaiDoan}
                onChange={(e) => setGiaiDoan(e.target.value)}
              />
            </Field>
          </div>
          <Btn onClick={them} disabled={saving}>
            {saving ? "Đang lưu…" : "+ Ghi"}
          </Btn>
        </div>
        {err && (
          <p style={{ color: "var(--danger)", margin: "4px 0 0" }}>{err}</p>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 8 }}>
          Lịch sử ({rows.length})
        </div>
        {loading ? (
          <p>Đang tải…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "var(--ink-muted)" }}>Chưa có lịch sử chăm sóc.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r: any) => (
              <div
                key={r.id}
                style={{
                  background: "#f7fafd",
                  borderRadius: 10,
                  padding: "8px 12px",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  {r.thoi_gian} · {r.nguoi_thuc_hien}
                  {r.giai_doan ? ` · ${r.giai_doan}` : ""}
                </div>
                <div>{r.noi_dung}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
