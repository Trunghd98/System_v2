import { query, one, run, nextSeq, pad, loi, toInt, todayVN } from "../db";
import type { SessionUser } from "../auth";

/* ==================== KHÓA HỌC ==================== */

export async function dsKhoaHoc(db: D1Database) {
  return query(db, "SELECT * FROM khoahoc ORDER BY khoa_id");
}

export async function themKhoaHoc(db: D1Database, p: any) {
  const ten = String(p.ten_khoa || "").trim();
  if (!ten) throw loi("Thiếu tên khóa");
  const seq = await nextSeq(db, "SEQ_KHOAHOC");
  const khoa_id = "KH" + pad(seq, 3);
  await run(
    db,
    "INSERT INTO khoahoc(khoa_id,ten_khoa,ngon_ngu,loai,so_buoi_mac_dinh,gia_goc_mac_dinh,trang_thai) VALUES(?,?,?,?,?,?,?)",
    khoa_id,
    ten,
    p.ngon_ngu || "",
    p.loai || "",
    toInt(p.so_buoi_mac_dinh),
    toInt(p.gia_goc_mac_dinh),
    p.trang_thai || "đang_mở",
  );
  return { khoa_id };
}

export async function capNhatKhoaHoc(db: D1Database, p: any) {
  const khoa_id = String(p.khoa_id || "").trim();
  if (!khoa_id) throw loi("Thiếu khoa_id");
  const res = await run(
    db,
    "UPDATE khoahoc SET ten_khoa=?, ngon_ngu=?, loai=?, so_buoi_mac_dinh=?, gia_goc_mac_dinh=?, trang_thai=? WHERE khoa_id=?",
    String(p.ten_khoa || "").trim(),
    p.ngon_ngu || "",
    p.loai || "",
    toInt(p.so_buoi_mac_dinh),
    toInt(p.gia_goc_mac_dinh),
    p.trang_thai || "đang_mở",
    khoa_id,
  );
  if (!res.meta.changes) throw loi("Không tìm thấy khóa: " + khoa_id, 404);
  return { ok: true };
}

export async function xoaKhoaHoc(db: D1Database, p: any) {
  const khoa_id = String(p.khoa_id || "").trim();
  if (!khoa_id) throw loi("Thiếu khoa_id");
  const dungLop = await one(
    db,
    "SELECT lop_id FROM lop WHERE khoa_id=? LIMIT 1",
    khoa_id,
  );
  if (dungLop)
    throw loi(
      'Khóa đang có lớp — không thể xóa. Hãy đổi trạng thái sang "đã_đóng".',
      409,
    );
  const dungGD = await one(
    db,
    "SELECT ghidanh_id FROM ghidanh WHERE khoa_id=? LIMIT 1",
    khoa_id,
  );
  if (dungGD)
    throw loi(
      'Khóa đã có ghi danh — không thể xóa. Hãy đổi trạng thái sang "đã_đóng".',
      409,
    );
  const res = await run(db, "DELETE FROM khoahoc WHERE khoa_id=?", khoa_id);
  if (!res.meta.changes) throw loi("Không tìm thấy khóa: " + khoa_id, 404);
  return { ok: true };
}

/* ==================== HỌC VIÊN / LEAD ==================== */

function thangKeyVN(): string {
  const s = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return s.slice(0, 4) + s.slice(5, 7);
}
function b36(n: number, len: number): string {
  return n.toString(36).toUpperCase().padStart(len, "0");
}
function nowVN(): string {
  const d = new Date();
  const day = d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return day + " " + time;
}

async function timTrung(
  db: D1Database,
  ho_ten: string,
  sdt: string,
  exceptMa: string | null,
): Promise<string | null> {
  const hn = ho_ten.trim().toLowerCase().replace(/\s+/g, " ");
  const s = sdt.trim();
  if (!hn || !s) return null;
  const rows = await query<any>(
    db,
    "SELECT ma_dinh_danh, ho_ten_hv FROM hocvien WHERE sdt_ph=?",
    s,
  );
  for (const r of rows) {
    if (exceptMa && r.ma_dinh_danh === exceptMa) continue;
    const rn = String(r.ho_ten_hv || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (rn === hn) return r.ma_dinh_danh;
  }
  return null;
}

export async function dsHocVien(db: D1Database) {
  return query(
    db,
    "SELECT * FROM hocvien ORDER BY ngay_tao DESC, ma_dinh_danh DESC",
  );
}

export async function themHocVien(db: D1Database, p: any) {
  const ho_ten = String(p.ho_ten_hv || "").trim();
  if (!ho_ten) throw loi("Thiếu tên học viên");
  const sdt = String(p.sdt_ph || "").trim();
  const trung = await timTrung(db, ho_ten, sdt, null);
  if (trung)
    throw loi(
      "Đã có học viên trùng tên và SĐT (mã " +
        trung +
        "). Nếu là anh/chị em khác, hãy đổi tên cho đúng.",
      409,
    );
  const ym = thangKeyVN();
  const seq = await nextSeq(db, "HV_" + ym);
  const ma = "U" + ym + b36(seq, 3);
  await run(
    db,
    "INSERT INTO hocvien(ma_dinh_danh,ho_ten_hv,nam_sinh,ho_ten_ph,sdt_ph,lien_lac_hv,nguon,nguoi_gt_loai,nguoi_gt_id,sale_phu_trach,trang_thai,ngay_tao,ghi_chu) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ma,
    ho_ten,
    p.nam_sinh || "",
    p.ho_ten_ph || "",
    sdt,
    String(p.lien_lac_hv || "").trim(),
    p.nguon || "",
    p.nguoi_gt_loai || "KHÔNG",
    p.nguoi_gt_id || "",
    p.sale_phu_trach || "",
    p.trang_thai || "lead_mới",
    todayVN(),
    p.ghi_chu || "",
  );
  return { ma_dinh_danh: ma };
}

export async function capNhatHocVien(db: D1Database, p: any) {
  const ma = String(p.ma_dinh_danh || "").trim();
  if (!ma) throw loi("Thiếu ma_dinh_danh");
  const trung = await timTrung(
    db,
    String(p.ho_ten_hv || ""),
    String(p.sdt_ph || ""),
    ma,
  );
  if (trung)
    throw loi("Trùng học viên khác cùng tên + SĐT (mã " + trung + ").", 409);
  const res = await run(
    db,
    "UPDATE hocvien SET ho_ten_hv=?, nam_sinh=?, ho_ten_ph=?, sdt_ph=?, lien_lac_hv=?, nguon=?, nguoi_gt_loai=?, nguoi_gt_id=?, sale_phu_trach=?, trang_thai=?, ghi_chu=? WHERE ma_dinh_danh=?",
    String(p.ho_ten_hv || "").trim(),
    p.nam_sinh || "",
    p.ho_ten_ph || "",
    String(p.sdt_ph || "").trim(),
    String(p.lien_lac_hv || "").trim(),
    p.nguon || "",
    p.nguoi_gt_loai || "KHÔNG",
    p.nguoi_gt_id || "",
    p.sale_phu_trach || "",
    p.trang_thai || "lead_mới",
    p.ghi_chu || "",
    ma,
  );
  if (!res.meta.changes) throw loi("Không tìm thấy học viên: " + ma, 404);
  return { ok: true };
}

export async function xoaHocVien(db: D1Database, p: any) {
  const ma = String(p.ma_dinh_danh || "").trim();
  if (!ma) throw loi("Thiếu ma_dinh_danh");
  const gd = await one(
    db,
    "SELECT ghidanh_id FROM ghidanh WHERE ma_dinh_danh=? LIMIT 1",
    ma,
  );
  if (gd)
    throw loi(
      "Học viên đã có ghi danh — không thể xóa. Hãy đổi trạng thái.",
      409,
    );
  await run(db, "DELETE FROM lichsu_chamsoc WHERE ma_dinh_danh=?", ma);
  const res = await run(db, "DELETE FROM hocvien WHERE ma_dinh_danh=?", ma);
  if (!res.meta.changes) throw loi("Không tìm thấy học viên: " + ma, 404);
  return { ok: true };
}

/* ==================== CHĂM SÓC ==================== */

export async function dsChamSoc(db: D1Database, p: any) {
  const ma = String(p.ma_dinh_danh || "").trim();
  if (!ma) throw loi("Thiếu ma_dinh_danh");
  return query(
    db,
    "SELECT * FROM lichsu_chamsoc WHERE ma_dinh_danh=? ORDER BY thoi_gian DESC, id DESC",
    ma,
  );
}

export async function themChamSoc(db: D1Database, p: any, user: SessionUser) {
  const ma = String(p.ma_dinh_danh || "").trim();
  if (!ma) throw loi("Thiếu ma_dinh_danh");
  const noi_dung = String(p.noi_dung || "").trim();
  if (!noi_dung) throw loi("Thiếu nội dung");
  await run(
    db,
    "INSERT INTO lichsu_chamsoc(ma_dinh_danh,thoi_gian,nguoi_thuc_hien,noi_dung,giai_doan) VALUES(?,?,?,?,?)",
    ma,
    nowVN(),
    user?.ho_ten || user?.staff_id || "",
    noi_dung,
    p.giai_doan || "",
  );
  return { ok: true };
}

/* ==================== NGƯỜI GIỚI THIỆU (đối tác + nhân viên) ==================== */

export async function dsNguoiGioiThieu(db: D1Database) {
  const dt = await query(
    db,
    "SELECT doitac_id AS id, ten_doi_tac AS ten, 'ĐỐI_TÁC' AS loai FROM doitac",
  );
  const ns = await query(
    db,
    "SELECT staff_id AS id, ho_ten AS ten, 'NHÂN_VIÊN' AS loai FROM nhansu WHERE trang_thai='đang_làm'",
  );
  return [...dt, ...ns];
}

/* ==================== GHI DANH (đăng ký khóa) ==================== */

export async function dsGhiDanh(db: D1Database) {
  return query(
    db,
    `SELECT g.*, h.ho_ten_hv, k.ten_khoa
       FROM ghidanh g
       LEFT JOIN hocvien h ON h.ma_dinh_danh = g.ma_dinh_danh
       LEFT JOIN khoahoc k ON k.khoa_id = g.khoa_id
      ORDER BY g.ghidanh_id DESC`,
  );
}

export async function themGhiDanh(db: D1Database, p: any) {
  const ma = String(p.ma_dinh_danh || "").trim();
  if (!ma) throw loi("Thiếu học viên");
  const khoa_id = String(p.khoa_id || "").trim();
  if (!khoa_id) throw loi("Thiếu khóa học");

  const hv = await one(
    db,
    "SELECT ma_dinh_danh FROM hocvien WHERE ma_dinh_danh=?",
    ma,
  );
  if (!hv) throw loi("Không tìm thấy học viên: " + ma, 404);
  const khoa = await one<any>(
    db,
    "SELECT * FROM khoahoc WHERE khoa_id=?",
    khoa_id,
  );
  if (!khoa) throw loi("Không tìm thấy khóa: " + khoa_id, 404);

  const hinh_thuc = p.hinh_thuc_dong || "TRỌN_KHÓA";
  const gia_goc =
    p.gia_goc != null ? toInt(p.gia_goc) : toInt(khoa.gia_goc_mac_dinh);
  const muc_giam = toInt(p.muc_giam);
  const gia_cuoi = Math.max(gia_goc - muc_giam, 0);
  const so_buoi =
    p.so_buoi_dang_ky != null
      ? toInt(p.so_buoi_dang_ky)
      : toInt(khoa.so_buoi_mac_dinh);
  const nguoi_gt_loai = p.nguoi_gt_loai || "KHÔNG";
  const nguoi_gt_id = p.nguoi_gt_id || "";
  const hh_hinh_thuc = p.hh_hinh_thuc || "";
  const hh_gia_tri = toInt(p.hh_gia_tri);

  const seq = await nextSeq(db, "SEQ_GHIDANH");
  const ghidanh_id = "GD" + pad(seq, 5);
  await run(
    db,
    "INSERT INTO ghidanh(ghidanh_id,ma_dinh_danh,khoa_id,hinh_thuc_dong,gia_goc,muc_giam,ly_do_giam,gia_cuoi,so_buoi_dang_ky,nguoi_gt_loai,nguoi_gt_id,hh_hinh_thuc,hh_gia_tri,ngay_ghidanh,trang_thai) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ghidanh_id,
    ma,
    khoa_id,
    hinh_thuc,
    gia_goc,
    muc_giam,
    p.ly_do_giam || "",
    gia_cuoi,
    so_buoi,
    nguoi_gt_loai,
    nguoi_gt_id,
    hh_hinh_thuc,
    hh_gia_tri,
    todayVN(),
    "đang_học",
  );

  await run(
    db,
    "UPDATE hocvien SET trang_thai='đã_đăng_ký' WHERE ma_dinh_danh=?",
    ma,
  );

  let hoahong_id: string | null = null;
  if (nguoi_gt_loai !== "KHÔNG" && nguoi_gt_id && hh_gia_tri > 0) {
    const so_tien =
      hh_hinh_thuc === "PHẦN_TRĂM"
        ? Math.round((gia_cuoi * hh_gia_tri) / 100)
        : hh_gia_tri;
    const hseq = await nextSeq(db, "SEQ_HOAHONG");
    hoahong_id = "HH" + pad(hseq, 5);
    await run(
      db,
      "INSERT INTO hoahong(hoahong_id,nguoi_gt_loai,nguoi_gt_id,ma_dinh_danh,ghidanh_id,hinh_thuc,gia_tri,so_tien,trang_thai,ngay_phat_sinh,ngay_chi) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      hoahong_id,
      nguoi_gt_loai,
      nguoi_gt_id,
      ma,
      ghidanh_id,
      hh_hinh_thuc,
      hh_gia_tri,
      so_tien,
      "chờ_chi",
      todayVN(),
      "",
    );
  }

  return { ghidanh_id, gia_cuoi, hoahong_id };
}
