import { query, one, run, nextSeq, pad, loi, toInt, todayVN } from "../db";

function namVN(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
    .slice(0, 4);
}

/* ==================== GIÁO VIÊN (cho dropdown) ==================== */

export async function dsGiaoVien(db: D1Database) {
  return query(
    db,
    "SELECT staff_id, ho_ten FROM nhansu WHERE co_day='có' AND trang_thai='đang_làm' ORDER BY staff_id",
  );
}

/* ==================== LỚP ==================== */

export async function dsLop(db: D1Database) {
  return query(
    db,
    `SELECT l.*, k.ten_khoa, n.ho_ten AS gv_ten
       FROM lop l
       LEFT JOIN khoahoc k ON k.khoa_id = l.khoa_id
       LEFT JOIN nhansu  n ON n.staff_id = l.gv_chinh_id
      ORDER BY l.lop_id DESC`,
  );
}

export async function themLop(db: D1Database, p: any) {
  const ten = String(p.ten_lop || "").trim();
  if (!ten) throw loi("Thiếu tên lớp");
  const khoa_id = String(p.khoa_id || "").trim();
  if (!khoa_id) throw loi("Thiếu khóa học");
  const khoa = await one<any>(
    db,
    "SELECT so_buoi_mac_dinh FROM khoahoc WHERE khoa_id=?",
    khoa_id,
  );
  if (!khoa) throw loi("Không tìm thấy khóa: " + khoa_id, 404);

  const year = namVN();
  const seq = await nextSeq(db, "LOP_" + year);
  const lop_id = "CL" + year + pad(seq, 3);
  const so_buoi =
    p.so_buoi != null ? toInt(p.so_buoi) : toInt(khoa.so_buoi_mac_dinh);

  await run(
    db,
    "INSERT INTO lop(lop_id,ten_lop,khoa_id,gv_chinh_id,hinh_thuc,link_meet,phong,ngay_bat_dau,lich_hoc,so_buoi,trang_thai) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    lop_id,
    ten,
    khoa_id,
    p.gv_chinh_id || "",
    p.hinh_thuc || "online",
    p.link_meet || "",
    p.phong || "",
    p.ngay_bat_dau || "",
    p.lich_hoc || "",
    so_buoi,
    p.trang_thai || "mở",
  );
  return { lop_id };
}

export async function capNhatLop(db: D1Database, p: any) {
  const lop_id = String(p.lop_id || "").trim();
  if (!lop_id) throw loi("Thiếu lop_id");
  const res = await run(
    db,
    "UPDATE lop SET ten_lop=?, khoa_id=?, gv_chinh_id=?, hinh_thuc=?, link_meet=?, phong=?, ngay_bat_dau=?, lich_hoc=?, so_buoi=?, trang_thai=? WHERE lop_id=?",
    String(p.ten_lop || "").trim(),
    p.khoa_id || "",
    p.gv_chinh_id || "",
    p.hinh_thuc || "online",
    p.link_meet || "",
    p.phong || "",
    p.ngay_bat_dau || "",
    p.lich_hoc || "",
    toInt(p.so_buoi),
    p.trang_thai || "mở",
    lop_id,
  );
  if (!res.meta.changes) throw loi("Không tìm thấy lớp: " + lop_id, 404);
  return { ok: true };
}

/* ==================== XẾP HỌC VIÊN VÀO LỚP ==================== */

/** Ghi danh đủ điều kiện xếp vào lớp: cùng khóa của lớp, chưa có trong lớp. */
export async function dsGhiDanhChoLop(db: D1Database, p: any) {
  const lop_id = String(p.lop_id || "").trim();
  if (!lop_id) throw loi("Thiếu lop_id");
  const lop = await one<any>(
    db,
    "SELECT khoa_id FROM lop WHERE lop_id=?",
    lop_id,
  );
  if (!lop) throw loi("Không tìm thấy lớp: " + lop_id, 404);
  return query(
    db,
    `SELECT g.ghidanh_id, g.ma_dinh_danh, g.hinh_thuc_dong, g.gia_cuoi, g.so_buoi_dang_ky,
            h.ho_ten_hv, h.sdt_ph
       FROM ghidanh g
       LEFT JOIN hocvien h ON h.ma_dinh_danh = g.ma_dinh_danh
      WHERE g.khoa_id = ?
        AND g.ma_dinh_danh NOT IN (SELECT ma_dinh_danh FROM lop_hocvien WHERE lop_id = ? AND trang_thai != 'đã_rời')
      ORDER BY g.ghidanh_id DESC`,
    lop.khoa_id,
    lop_id,
  );
}

export async function dsHocVienLop(db: D1Database, p: any) {
  const lop_id = String(p.lop_id || "").trim();
  if (!lop_id) throw loi("Thiếu lop_id");
  return query(
    db,
    `SELECT lh.*, h.ho_ten_hv, h.sdt_ph, g.hinh_thuc_dong, g.gia_cuoi
       FROM lop_hocvien lh
       LEFT JOIN hocvien h ON h.ma_dinh_danh = lh.ma_dinh_danh
       LEFT JOIN ghidanh g ON g.ghidanh_id = lh.ghidanh_id
      WHERE lh.lop_id = ? AND lh.trang_thai != 'đã_rời'
      ORDER BY lh.id`,
    lop_id,
  );
}

/** Thêm nhiều học viên vào lớp trong một lần; bỏ qua em đã có. */
export async function themNhieuHocVienVaoLop(db: D1Database, p: any) {
  const lop_id = String(p.lop_id || "").trim();
  if (!lop_id) throw loi("Thiếu lop_id");
  const items = Array.isArray(p.items) ? p.items : [];
  if (!items.length) throw loi("Chưa chọn học viên nào");

  const daCoRows = await query<any>(
    db,
    "SELECT ma_dinh_danh FROM lop_hocvien WHERE lop_id=? AND trang_thai!='đã_rời'",
    lop_id,
  );
  const daCo = new Set(daCoRows.map((r) => r.ma_dinh_danh));

  let taoMoi = 0,
    boQua = 0;
  for (const it of items) {
    const ma = String(it.ma_dinh_danh || "").trim();
    if (!ma) continue;
    if (daCo.has(ma)) {
      boQua++;
      continue;
    }
    daCo.add(ma);
    await run(
      db,
      "INSERT INTO lop_hocvien(lop_id,ma_dinh_danh,ghidanh_id,gia_buoi_rieng,ngay_them,trang_thai) VALUES(?,?,?,?,?,?)",
      lop_id,
      ma,
      it.ghidanh_id || "",
      toInt(it.gia_buoi_rieng),
      todayVN(),
      "đang_học",
    );
    taoMoi++;
  }
  return { taoMoi, boQua };
}

export async function xoaHocVienKhoiLop(db: D1Database, p: any) {
  if (p.id != null && p.id !== "") {
    const res = await run(
      db,
      "UPDATE lop_hocvien SET trang_thai='đã_rời' WHERE id=?",
      toInt(p.id),
    );
    if (!res.meta.changes) throw loi("Không tìm thấy dòng id=" + p.id, 404);
  } else if (p.lop_id && p.ma_dinh_danh) {
    const res = await run(
      db,
      "UPDATE lop_hocvien SET trang_thai='đã_rời' WHERE lop_id=? AND ma_dinh_danh=?",
      p.lop_id,
      p.ma_dinh_danh,
    );
    if (!res.meta.changes) throw loi("Không tìm thấy học viên trong lớp", 404);
  } else {
    throw loi("Thiếu id hoặc (lop_id + ma_dinh_danh)");
  }
  return { ok: true };
}

/* ==================== BUỔI HỌC ==================== */

/** Thứ trong tuần theo yyyy-MM-dd, giờ VN. CN=0..T7=6 (JS getDay trên UTC noon để tránh lệch). */
function thuTrongTuan(ymd: string): number {
  const d = new Date(ymd + "T12:00:00+07:00");
  return d.getUTCDay();
}
function congNgay(ymd: string, n: number): string {
  const d = new Date(ymd + "T12:00:00+07:00");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function dsBuoiHoc(db: D1Database, p: any) {
  const lop_id = String(p.lop_id || "").trim();
  if (!lop_id) throw loi("Thiếu lop_id");
  return query(
    db,
    `SELECT b.*, n.ho_ten AS gv_ten,
            (SELECT COUNT(*) FROM diemdanh d WHERE d.buoi_id=b.buoi_id AND d.trang_thai='có_mặt') AS so_co_mat
       FROM buoihoc b
       LEFT JOIN nhansu n ON n.staff_id=b.gv_thuc_day_id
      WHERE b.lop_id=?
      ORDER BY b.ngay_hoc, b.buoi_id`,
    lop_id,
  );
}

async function soBuoiHienCo(db: D1Database, lop_id: string): Promise<number> {
  const r = await one<any>(
    db,
    "SELECT COUNT(*) AS n FROM buoihoc WHERE lop_id=?",
    lop_id,
  );
  return r?.n || 0;
}
function maBuoi(lop_id: string, stt: number): string {
  return lop_id + "-B" + pad(stt, 2);
}

export async function themBuoiHoc(db: D1Database, p: any) {
  const lop_id = String(p.lop_id || "").trim();
  if (!lop_id) throw loi("Thiếu lop_id");
  const lop = await one<any>(
    db,
    "SELECT gv_chinh_id FROM lop WHERE lop_id=?",
    lop_id,
  );
  if (!lop) throw loi("Không tìm thấy lớp: " + lop_id, 404);
  const stt = (await soBuoiHienCo(db, lop_id)) + 1;
  const buoi_id = maBuoi(lop_id, stt);
  await run(
    db,
    "INSERT INTO buoihoc(buoi_id,lop_id,ngay_hoc,gio_hoc,gv_thuc_day_id,trang_thai,ghi_chu) VALUES(?,?,?,?,?,?,?)",
    buoi_id,
    lop_id,
    p.ngay_hoc || "",
    p.gio_hoc || "",
    p.gv_thuc_day_id || lop.gv_chinh_id || "",
    p.trang_thai || "dự_kiến",
    p.ghi_chu || "",
  );
  return { buoi_id };
}

/** Tạo hàng loạt buổi: từ ngày bắt đầu, theo các thứ trong tuần, đủ số buổi. */
export async function taoBuoiHangLoat(db: D1Database, p: any) {
  const lop_id = String(p.lop_id || "").trim();
  if (!lop_id) throw loi("Thiếu lop_id");
  const lop = await one<any>(
    db,
    "SELECT gv_chinh_id FROM lop WHERE lop_id=?",
    lop_id,
  );
  if (!lop) throw loi("Không tìm thấy lớp: " + lop_id, 404);

  const ngay_bat_dau = String(p.ngay_bat_dau || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay_bat_dau))
    throw loi("Ngày bắt đầu không hợp lệ (yyyy-MM-dd)");
  const soBuoi = toInt(p.so_buoi);
  if (soBuoi < 1) throw loi("Số buổi phải ≥ 1");
  const thu: number[] = Array.isArray(p.thu)
    ? p.thu.map((x: any) => toInt(x))
    : [];
  if (!thu.length) throw loi("Chọn ít nhất một thứ trong tuần");
  const gio_hoc = p.gio_hoc || "";
  const gv = p.gv_thuc_day_id || lop.gv_chinh_id || "";

  let stt = await soBuoiHienCo(db, lop_id);
  let cur = ngay_bat_dau,
    dem = 0,
    guard = 0;
  const rows: any[] = [];
  while (dem < soBuoi && guard < 1000) {
    guard++;
    if (thu.indexOf(thuTrongTuan(cur)) >= 0) {
      stt++;
      dem++;
      rows.push({ buoi_id: maBuoi(lop_id, stt), ngay_hoc: cur });
    }
    cur = congNgay(cur, 1);
  }
  for (const r of rows) {
    await run(
      db,
      "INSERT INTO buoihoc(buoi_id,lop_id,ngay_hoc,gio_hoc,gv_thuc_day_id,trang_thai,ghi_chu) VALUES(?,?,?,?,?,?,?)",
      r.buoi_id,
      lop_id,
      r.ngay_hoc,
      gio_hoc,
      gv,
      "dự_kiến",
      "",
    );
  }
  return { taoMoi: rows.length };
}

export async function capNhatBuoiHoc(db: D1Database, p: any) {
  const buoi_id = String(p.buoi_id || "").trim();
  if (!buoi_id) throw loi("Thiếu buoi_id");
  const sets: string[] = [],
    binds: any[] = [];
  if (p.ngay_hoc != null) {
    sets.push("ngay_hoc=?");
    binds.push(p.ngay_hoc);
  }
  if (p.gio_hoc != null) {
    sets.push("gio_hoc=?");
    binds.push(p.gio_hoc);
  }
  if (p.gv_thuc_day_id != null) {
    sets.push("gv_thuc_day_id=?");
    binds.push(p.gv_thuc_day_id);
  }
  if (p.trang_thai != null) {
    sets.push("trang_thai=?");
    binds.push(p.trang_thai);
  }
  if (p.ghi_chu != null) {
    sets.push("ghi_chu=?");
    binds.push(p.ghi_chu);
  }
  if (!sets.length) throw loi("Không có gì để cập nhật");
  binds.push(buoi_id);
  const res = await run(
    db,
    "UPDATE buoihoc SET " + sets.join(", ") + " WHERE buoi_id=?",
    ...binds,
  );
  if (!res.meta.changes) throw loi("Không tìm thấy buổi: " + buoi_id, 404);
  return { ok: true };
}

/* ==================== ĐIỂM DANH ==================== */

/** Danh sách học viên của lớp + trạng thái điểm danh của buổi (nếu đã có). */
export async function dsDiemDanh(db: D1Database, p: any) {
  const buoi_id = String(p.buoi_id || "").trim();
  if (!buoi_id) throw loi("Thiếu buoi_id");
  const buoi = await one<any>(
    db,
    "SELECT lop_id FROM buoihoc WHERE buoi_id=?",
    buoi_id,
  );
  if (!buoi) throw loi("Không tìm thấy buổi: " + buoi_id, 404);
  return query(
    db,
    `SELECT lh.ma_dinh_danh, h.ho_ten_hv,
            COALESCE(d.trang_thai, 'có_mặt') AS trang_thai
       FROM lop_hocvien lh
       LEFT JOIN hocvien h ON h.ma_dinh_danh = lh.ma_dinh_danh
       LEFT JOIN diemdanh d ON d.buoi_id = ? AND d.ma_dinh_danh = lh.ma_dinh_danh
      WHERE lh.lop_id = ? AND lh.trang_thai != 'đã_rời'
      ORDER BY lh.id`,
    buoi_id,
    buoi.lop_id,
  );
}

/** Lưu điểm danh: ghi trạng thái từng em; buổi chuyển sang đã_dạy. */
export async function luuDiemDanh(db: D1Database, p: any) {
  const buoi_id = String(p.buoi_id || "").trim();
  if (!buoi_id) throw loi("Thiếu buoi_id");
  const buoi = await one<any>(
    db,
    "SELECT buoi_id FROM buoihoc WHERE buoi_id=?",
    buoi_id,
  );
  if (!buoi) throw loi("Không tìm thấy buổi: " + buoi_id, 404);
  const rows: any[] = Array.isArray(p.rows) ? p.rows : [];
  if (!rows.length) throw loi("Không có dữ liệu điểm danh");

  for (const r of rows) {
    const ma = String(r.ma_dinh_danh || "").trim();
    if (!ma) continue;
    const tt = r.trang_thai || "có_mặt";
    await run(
      db,
      "DELETE FROM diemdanh WHERE buoi_id=? AND ma_dinh_danh=?",
      buoi_id,
      ma,
    );
    await run(
      db,
      "INSERT INTO diemdanh(buoi_id,ma_dinh_danh,trang_thai,ghi_chu) VALUES(?,?,?,?)",
      buoi_id,
      ma,
      tt,
      r.ghi_chu || "",
    );
  }
  await run(
    db,
    "UPDATE buoihoc SET trang_thai='đã_dạy' WHERE buoi_id=?",
    buoi_id,
  );
  return { ok: true, so_hoc_vien: rows.length };
}
