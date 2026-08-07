import { useEffect, useMemo, useState } from "react";
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

const RONG: any = {
  ma_dinh_danh: "",
  khoa_id: "",
  hinh_thuc_dong: "TRỌN_KHÓA",
  gia_goc: "",
  muc_giam: 0,
  ly_do_giam: "",
  so_buoi_dang_ky: "",
  nguoi_gt_loai: "KHÔNG",
  nguoi_gt_id: "",
  hh_hinh_thuc: "PHẦN_TRĂM",
  hh_gia_tri: 0,
};

export default function GhiDanh() {
  const [rows, setRows] = useState<any[]>([]);
  const [hvs, setHvs] = useState<any[]>([]);
  const [khoas, setKhoas] = useState<any[]>([]);
  const [ngts, setNgts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function taiDL() {
    setLoading(true);
    setErr("");
    try {
      const [gd, hv, kh, ng] = await Promise.all([
        goiAPI("dsGhiDanh"),
        goiAPI("dsHocVien"),
        goiAPI("dsKhoaHoc"),
        goiAPI("dsNguoiGioiThieu"),
      ]);
      setRows(gd);
      setHvs(hv);
      setKhoas(kh);
      setNgts(ng);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    taiDL();
  }, []);

  function chonKhoa(id: string) {
    const k = khoas.find((x) => x.khoa_id === id);
    setForm((f: any) => ({
      ...f,
      khoa_id: id,
      gia_goc: k ? k.gia_goc_mac_dinh : f.gia_goc,
      so_buoi_dang_ky: k ? k.so_buoi_mac_dinh : f.so_buoi_dang_ky,
    }));
  }

  const giaCuoi = useMemo(
    () =>
      Math.max((Number(form?.gia_goc) || 0) - (Number(form?.muc_giam) || 0), 0),
    [form],
  );
  const hhTien = useMemo(() => {
    if (
      !form ||
      form.nguoi_gt_loai === "KHÔNG" ||
      !(Number(form.hh_gia_tri) > 0)
    )
      return 0;
    return form.hh_hinh_thuc === "PHẦN_TRĂM"
      ? Math.round((giaCuoi * Number(form.hh_gia_tri)) / 100)
      : Number(form.hh_gia_tri);
  }, [form, giaCuoi]);
  const nguoiLoc = useMemo(
    () => ngts.filter((n) => n.loai === form?.nguoi_gt_loai),
    [ngts, form?.nguoi_gt_loai],
  );

  async function luu() {
    if (!form.ma_dinh_danh) {
      setErr("Chọn học viên");
      return;
    }
    if (!form.khoa_id) {
      setErr("Chọn khóa học");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await goiAPI("themGhiDanh", form);
      setForm(null);
      await taiDL();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="tcnf-pagehead">
        <h3 style={{ margin: 0, color: "var(--navy)" }}>Ghi danh</h3>
        <div style={{ marginLeft: "auto" }}>
          <Btn onClick={() => setForm({ ...RONG, _moi: true })}>
            + Ghi danh mới
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
              <th style={thStyle}>Khóa</th>
              <th style={thStyle}>Hình thức</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Giá cuối</th>
              <th style={thStyle}>Ngày</th>
              <th style={thStyle}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={tdStyle} colSpan={7}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td style={tdStyle} colSpan={7}>
                  Chưa có ghi danh.
                </td>
              </tr>
            ) : (
              rows.map((g) => (
                <tr
                  key={g.ghidanh_id}
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <td style={tdStyle}>{g.ghidanh_id}</td>
                  <td style={tdStyle}>
                    {g.ma_dinh_danh} · {g.ho_ten_hv}
                  </td>
                  <td style={tdStyle}>
                    {g.khoa_id} · {g.ten_khoa}
                  </td>
                  <td style={tdStyle}>{g.hinh_thuc_dong}</td>
                  <td style={tdRight}>{dinhDangTien(g.gia_cuoi)}</td>
                  <td style={tdStyle}>{g.ngay_ghidanh}</td>
                  <td style={tdStyle}>
                    <span className="badge badge--ok">{g.trang_thai}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          title="Ghi danh mới"
          onClose={() => setForm(null)}
          footer={
            <>
              <Btn kind="ghost" onClick={() => setForm(null)}>
                Hủy
              </Btn>
              <Btn onClick={luu} disabled={saving}>
                {saving ? "Đang lưu…" : "Ghi danh"}
              </Btn>
            </>
          }
        >
          <Field label="Học viên">
            <select
              style={inputStyle}
              value={form.ma_dinh_danh}
              onChange={(e) =>
                setForm({ ...form, ma_dinh_danh: e.target.value })
              }
            >
              <option value="">— Chọn học viên —</option>
              {hvs.map((h) => (
                <option key={h.ma_dinh_danh} value={h.ma_dinh_danh}>
                  {h.ma_dinh_danh} · {h.ho_ten_hv}
                  {h.sdt_ph ? " · " + h.sdt_ph : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="tcnf-grid2">
            <Field label="Khóa học">
              <select
                style={inputStyle}
                value={form.khoa_id}
                onChange={(e) => chonKhoa(e.target.value)}
              >
                <option value="">— Chọn khóa —</option>
                {khoas.map((k) => (
                  <option key={k.khoa_id} value={k.khoa_id}>
                    {k.khoa_id} · {k.ten_khoa}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hình thức đóng">
              <select
                style={inputStyle}
                value={form.hinh_thuc_dong}
                onChange={(e) =>
                  setForm({ ...form, hinh_thuc_dong: e.target.value })
                }
              >
                <option value="TRỌN_KHÓA">TRỌN_KHÓA (đóng 1 lần)</option>
                <option value="THÁNG">THÁNG (theo buổi có mặt)</option>
                <option value="THÁNG_CỐ_ĐỊNH">
                  THÁNG_CỐ_ĐỊNH (cố định/tháng)
                </option>
              </select>
            </Field>
          </div>
          <div className="tcnf-grid2">
            <Field label="Giá gốc (đ)">
              <input
                style={inputStyle}
                type="number"
                value={form.gia_goc}
                onChange={(e) => setForm({ ...form, gia_goc: e.target.value })}
              />
            </Field>
            <Field label="Số buổi đăng ký">
              <input
                style={inputStyle}
                type="number"
                value={form.so_buoi_dang_ky}
                onChange={(e) =>
                  setForm({ ...form, so_buoi_dang_ky: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="tcnf-grid2">
            <Field label="Mức giảm (đ)">
              <input
                style={inputStyle}
                type="number"
                value={form.muc_giam}
                onChange={(e) => setForm({ ...form, muc_giam: e.target.value })}
              />
            </Field>
            <Field label="Lý do giảm">
              <input
                style={inputStyle}
                value={form.ly_do_giam}
                onChange={(e) =>
                  setForm({ ...form, ly_do_giam: e.target.value })
                }
              />
            </Field>
          </div>

          <div
            style={{
              background: "#f7fafd",
              borderRadius: 10,
              padding: "8px 12px",
              margin: "4px 0 12px",
              fontWeight: 600,
              color: "var(--navy)",
            }}
          >
            Giá cuối: {dinhDangTien(giaCuoi)} đ
          </div>

          <Field label="Người giới thiệu">
            <select
              style={inputStyle}
              value={form.nguoi_gt_loai}
              onChange={(e) =>
                setForm({
                  ...form,
                  nguoi_gt_loai: e.target.value,
                  nguoi_gt_id: "",
                })
              }
            >
              <option value="KHÔNG">Không có</option>
              <option value="NHÂN_VIÊN">Nhân viên</option>
              <option value="ĐỐI_TÁC">Đối tác</option>
            </select>
          </Field>

          {form.nguoi_gt_loai !== "KHÔNG" && (
            <>
              <Field label="Chọn người giới thiệu">
                <select
                  style={inputStyle}
                  value={form.nguoi_gt_id}
                  onChange={(e) =>
                    setForm({ ...form, nguoi_gt_id: e.target.value })
                  }
                >
                  <option value="">— Chọn —</option>
                  {nguoiLoc.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} · {n.ten}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="tcnf-grid2">
                <Field label="Kiểu hoa hồng">
                  <select
                    style={inputStyle}
                    value={form.hh_hinh_thuc}
                    onChange={(e) =>
                      setForm({ ...form, hh_hinh_thuc: e.target.value })
                    }
                  >
                    <option value="PHẦN_TRĂM">Phần trăm (%)</option>
                    <option value="CỐ_ĐỊNH">Cố định (đ)</option>
                  </select>
                </Field>
                <Field
                  label={
                    form.hh_hinh_thuc === "PHẦN_TRĂM"
                      ? "Tỷ lệ (%)"
                      : "Số tiền (đ)"
                  }
                >
                  <input
                    style={inputStyle}
                    type="number"
                    value={form.hh_gia_tri}
                    onChange={(e) =>
                      setForm({ ...form, hh_gia_tri: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div
                style={{
                  background: "#fff4e3",
                  borderRadius: 10,
                  padding: "8px 12px",
                  color: "var(--warn)",
                  fontWeight: 600,
                }}
              >
                Hoa hồng dự kiến: {dinhDangTien(hhTien)} đ{" "}
                {hhTien > 0 ? "(sẽ tự tạo khoản chờ chi)" : ""}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
