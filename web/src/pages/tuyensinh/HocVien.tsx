import { useEffect, useMemo, useState } from "react";
import { goiAPI } from "../../lib/api";
import {
  Modal,
  Field,
  inputStyle,
  Btn,
  thStyle,
  tdStyle,
} from "../../components/ui";
import ChamSoc from "./ChamSoc";

interface HV {
  ma_dinh_danh: string;
  ho_ten_hv: string;
  nam_sinh: string;
  ho_ten_ph: string;
  sdt_ph: string;
  lien_lac_hv: string;
  nguon: string;
  trang_thai: string;
  ghi_chu: string;
  ngay_tao: string;
}
const RONG: any = {
  ho_ten_hv: "",
  nam_sinh: "",
  ho_ten_ph: "",
  sdt_ph: "",
  lien_lac_hv: "",
  nguon: "",
  trang_thai: "lead_mới",
  ghi_chu: "",
};
const TRANG_THAI = [
  "lead_mới",
  "đang_tư_vấn",
  "đã_đăng_ký",
  "tạm_dừng",
  "không_quan_tâm",
];
const btnTeal: any = {
  background: "#e3f2f5",
  color: "var(--teal)",
  border: "none",
  borderRadius: 12,
  padding: "9px 14px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
const btnDanger: any = {
  background: "var(--danger-bg)",
  color: "var(--danger)",
  border: "none",
  borderRadius: 12,
  padding: "9px 14px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

export default function HocVien() {
  const [rows, setRows] = useState<HV[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [cs, setCs] = useState<HV | null>(null);

  async function taiDL() {
    setLoading(true);
    setErr("");
    try {
      setRows(await goiAPI("dsHocVien"));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    taiDL();
  }, []);

  const loc = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.ma_dinh_danh, r.ho_ten_hv, r.sdt_ph, r.ho_ten_ph].some((x) =>
        String(x || "")
          .toLowerCase()
          .includes(s),
      ),
    );
  }, [rows, q]);

  async function luu() {
    setSaving(true);
    setErr("");
    try {
      await goiAPI(form._moi ? "themHocVien" : "capNhatHocVien", form);
      setForm(null);
      await taiDL();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function xoa(h: HV) {
    if (!window.confirm(`Xóa học viên "${h.ho_ten_hv}" (${h.ma_dinh_danh})?`))
      return;
    setErr("");
    try {
      await goiAPI("xoaHocVien", { ma_dinh_danh: h.ma_dinh_danh });
      await taiDL();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="tcnf-pagehead">
        <h3 style={{ margin: 0, color: "var(--navy)" }}>Học viên</h3>
        <input
          placeholder="Tìm tên / SĐT / mã…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...inputStyle, width: 220, marginLeft: "auto" }}
        />
        <Btn onClick={() => setForm({ ...RONG, _moi: true })}>
          + Thêm học viên
        </Btn>
      </div>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}

      <div className="tcnf-card tcnf-tablewrap" style={{ padding: 0 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
            minWidth: 820,
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f2f6fb",
                color: "var(--navy)",
                textAlign: "left",
              }}
            >
              <th style={thStyle}>Mã</th>
              <th style={thStyle}>Học viên</th>
              <th style={thStyle}>Phụ huynh</th>
              <th style={thStyle}>SĐT</th>
              <th style={thStyle}>Nguồn</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={tdStyle} colSpan={7}>
                  Đang tải…
                </td>
              </tr>
            ) : loc.length === 0 ? (
              <tr>
                <td style={tdStyle} colSpan={7}>
                  Không có học viên.
                </td>
              </tr>
            ) : (
              loc.map((h) => (
                <tr
                  key={h.ma_dinh_danh}
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <td style={tdStyle}>{h.ma_dinh_danh}</td>
                  <td style={tdStyle}>
                    {h.ho_ten_hv}
                    {h.nam_sinh ? (
                      <span style={{ color: "var(--ink-muted)" }}>
                        {" "}
                        · {h.nam_sinh}
                      </span>
                    ) : null}
                  </td>
                  <td style={tdStyle}>{h.ho_ten_ph}</td>
                  <td style={tdStyle}>{h.sdt_ph}</td>
                  <td style={tdStyle}>{h.nguon}</td>
                  <td style={tdStyle}>
                    <span className="badge badge--muted">{h.trang_thai}</span>
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}
                    >
                      <button onClick={() => setCs(h)} style={btnTeal}>
                        Chăm sóc
                      </button>
                      <Btn
                        kind="ghost"
                        onClick={() => setForm({ ...h, _moi: false })}
                      >
                        Sửa
                      </Btn>
                      <button onClick={() => xoa(h)} style={btnDanger}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          title={
            form._moi ? "Thêm học viên" : "Sửa học viên " + form.ma_dinh_danh
          }
          onClose={() => setForm(null)}
          footer={
            <>
              <Btn kind="ghost" onClick={() => setForm(null)}>
                Hủy
              </Btn>
              <Btn onClick={luu} disabled={saving}>
                {saving ? "Đang lưu…" : "Lưu"}
              </Btn>
            </>
          }
        >
          <div className="tcnf-grid2">
            <Field label="Tên học viên">
              <input
                style={inputStyle}
                value={form.ho_ten_hv}
                onChange={(e) =>
                  setForm({ ...form, ho_ten_hv: e.target.value })
                }
              />
            </Field>
            <Field label="Năm sinh">
              <input
                style={inputStyle}
                value={form.nam_sinh}
                onChange={(e) => setForm({ ...form, nam_sinh: e.target.value })}
              />
            </Field>
          </div>
          <div className="tcnf-grid2">
            <Field label="Phụ huynh">
              <input
                style={inputStyle}
                value={form.ho_ten_ph}
                onChange={(e) =>
                  setForm({ ...form, ho_ten_ph: e.target.value })
                }
              />
            </Field>
            <Field label="SĐT phụ huynh">
              <input
                style={inputStyle}
                value={form.sdt_ph}
                onChange={(e) => setForm({ ...form, sdt_ph: e.target.value })}
              />
            </Field>
          </div>
          <div className="tcnf-grid2">
            <Field label="Liên lạc HV">
              <input
                style={inputStyle}
                value={form.lien_lac_hv}
                onChange={(e) =>
                  setForm({ ...form, lien_lac_hv: e.target.value })
                }
              />
            </Field>
            <Field label="Nguồn">
              <input
                style={inputStyle}
                value={form.nguon}
                onChange={(e) => setForm({ ...form, nguon: e.target.value })}
                placeholder="Facebook, giới thiệu…"
              />
            </Field>
          </div>
          <Field label="Trạng thái">
            <select
              style={inputStyle}
              value={form.trang_thai}
              onChange={(e) => setForm({ ...form, trang_thai: e.target.value })}
            >
              {TRANG_THAI.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ghi chú">
            <textarea
              style={{ ...inputStyle, minHeight: 60 }}
              value={form.ghi_chu}
              onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
            />
          </Field>
        </Modal>
      )}

      {cs && <ChamSoc hv={cs} onClose={() => setCs(null)} />}
    </div>
  );
}
