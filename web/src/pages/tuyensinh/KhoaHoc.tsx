import { useEffect, useState } from "react";
import { goiAPI } from "../../lib/api";
import {
  Modal,
  Field,
  inputStyle,
  Btn,
  thStyle,
  tdStyle,
  tdRight,
} from "../../components/ui";
import { dinhDangTien } from "../../lib/format";

interface Khoa {
  khoa_id: string;
  ten_khoa: string;
  ngon_ngu: string;
  loai: string;
  so_buoi_mac_dinh: number;
  gia_goc_mac_dinh: number;
  trang_thai: string;
}
const RONG: any = {
  ten_khoa: "",
  ngon_ngu: "",
  loai: "trực_tuyến",
  so_buoi_mac_dinh: "",
  gia_goc_mac_dinh: "",
  trang_thai: "đang_mở",
};

export default function KhoaHoc() {
  const [rows, setRows] = useState<Khoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function taiDL() {
    setLoading(true);
    setErr("");
    try {
      setRows(await goiAPI("dsKhoaHoc"));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    taiDL();
  }, []);

  async function luu() {
    setSaving(true);
    setErr("");
    try {
      await goiAPI(form._moi ? "themKhoaHoc" : "capNhatKhoaHoc", form);
      setForm(null);
      await taiDL();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function xoa(k: Khoa) {
    if (!window.confirm(`Xóa khóa "${k.ten_khoa}" (${k.khoa_id})?`)) return;
    setErr("");
    try {
      await goiAPI("xoaKhoaHoc", { khoa_id: k.khoa_id });
      await taiDL();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="tcnf-pagehead">
        <h3 style={{ margin: 0, color: "var(--navy)" }}>Khóa học</h3>
        <div style={{ marginLeft: "auto" }}>
          <Btn onClick={() => setForm({ ...RONG, _moi: true })}>
            + Thêm khóa học
          </Btn>
        </div>
      </div>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}

      <div className="tcnf-card tcnf-tablewrap" style={{ padding: 0 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
            minWidth: 720,
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
              <th style={thStyle}>Tên khóa</th>
              <th style={thStyle}>Ngôn ngữ</th>
              <th style={thStyle}>Loại</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Số buổi</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Giá gốc</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={tdStyle} colSpan={8}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td style={tdStyle} colSpan={8}>
                  Chưa có khóa học.
                </td>
              </tr>
            ) : (
              rows.map((k) => (
                <tr
                  key={k.khoa_id}
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <td style={tdStyle}>{k.khoa_id}</td>
                  <td style={tdStyle}>{k.ten_khoa}</td>
                  <td style={tdStyle}>{k.ngon_ngu}</td>
                  <td style={tdStyle}>{k.loai}</td>
                  <td style={tdRight}>{k.so_buoi_mac_dinh}</td>
                  <td style={tdRight}>{dinhDangTien(k.gia_goc_mac_dinh)}</td>
                  <td style={tdStyle}>
                    <span className="badge badge--muted">{k.trang_thai}</span>
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}
                    >
                      <Btn
                        kind="ghost"
                        onClick={() => setForm({ ...k, _moi: false })}
                      >
                        Sửa
                      </Btn>
                      <button
                        onClick={() => xoa(k)}
                        style={{
                          background: "var(--danger-bg)",
                          color: "var(--danger)",
                          border: "none",
                          borderRadius: 12,
                          padding: "9px 14px",
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
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
          title={form._moi ? "Thêm khóa học" : "Sửa khóa học " + form.khoa_id}
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
          <Field label="Tên khóa">
            <input
              style={inputStyle}
              value={form.ten_khoa}
              onChange={(e) => setForm({ ...form, ten_khoa: e.target.value })}
            />
          </Field>
          <div className="tcnf-grid2">
            <Field label="Ngôn ngữ">
              <input
                style={inputStyle}
                value={form.ngon_ngu}
                onChange={(e) => setForm({ ...form, ngon_ngu: e.target.value })}
              />
            </Field>
            <Field label="Loại">
              <select
                style={inputStyle}
                value={form.loai}
                onChange={(e) => setForm({ ...form, loai: e.target.value })}
              >
                <option value="trực_tuyến">trực_tuyến</option>
                <option value="trực_tiếp">trực_tiếp</option>
              </select>
            </Field>
          </div>
          <div className="tcnf-grid2">
            <Field label="Số buổi mặc định">
              <input
                style={inputStyle}
                type="number"
                value={form.so_buoi_mac_dinh}
                onChange={(e) =>
                  setForm({ ...form, so_buoi_mac_dinh: e.target.value })
                }
              />
            </Field>
            <Field label="Giá gốc mặc định (đ)">
              <input
                style={inputStyle}
                type="number"
                value={form.gia_goc_mac_dinh}
                onChange={(e) =>
                  setForm({ ...form, gia_goc_mac_dinh: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Trạng thái">
            <select
              style={inputStyle}
              value={form.trang_thai}
              onChange={(e) => setForm({ ...form, trang_thai: e.target.value })}
            >
              <option value="đang_mở">đang_mở</option>
              <option value="tạm_dừng">tạm_dừng</option>
              <option value="đã_đóng">đã_đóng</option>
            </select>
          </Field>
        </Modal>
      )}
    </div>
  );
}
