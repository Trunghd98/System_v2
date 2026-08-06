import { query, one, run, nextSeq, pad, loi, toInt, todayVN } from "../db";
import type { SessionUser } from "../auth";

const VAITRO_TRA_LUONG = ["Admin", "QL_VanHanh", "KeToan"];
function coQuyenTra(u: SessionUser): boolean {
  return (u?.vaiTro || []).some((v) => VAITRO_TRA_LUONG.includes(v));
}
function kyStr(v: unknown): string {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + "-" + m[2] : s;
}
async function mapTenNhanSu(db: D1Database): Promise<Record<string, string>> {
  const ns = await query<any>(db, "SELECT staff_id, ho_ten FROM nhansu");
  const m: Record<string, string> = {};
  ns.forEach((r) => {
    m[r.staff_id] = r.ho_ten;
  });
  return m;
}
async function mapDonGia(db: D1Database): Promise<Record<string, number>> {
  const dg = await query<any>(
    db,
    "SELECT gv_id, don_gia_buoi FROM dongia_gv WHERE (lop_id IS NULL OR lop_id='') AND id IN (SELECT MAX(id) FROM dongia_gv WHERE (lop_id IS NULL OR lop_id='') GROUP BY gv_id)",
  );
  const m: Record<string, number> = {};
  dg.forEach((r) => {
    m[r.gv_id] = toInt(r.don_gia_buoi);
  });
  return m;
}
/** Ghi một khoản chi nội bộ (khi trả lương / hoa hồng) → chảy vào Đối soát. */
async function themChiNoiBo(
  db: D1Database,
  loai: string,
  noi_dung: string,
  so_tien: number,
  nguoi_chi: string,
) {
  const chi_id = "CHI" + pad(await nextSeq(db, "SEQ_CHI"), 5);
  await run(
    db,
    "INSERT INTO chi(chi_id,ngay,loai,noi_dung,so_tien,nguoi_chi,ghi_chu) VALUES(?,?,?,?,?,?,?)",
    chi_id,
    todayVN(),
    loai,
    noi_dung,
    toInt(so_tien),
    nguoi_chi,
    "",
  );
}

/* ==================== LƯƠNG GIÁO VIÊN ==================== */

export async function luongGV(db: D1Database, p: any, user: SessionUser) {
  const thang = kyStr(p.thang);
  const laQL = coQuyenTra(user);
  const chiMinh =
    !laQL && (user.vaiTro || []).includes("GiaoVien") ? user.staff_id : null;

  const rate = await mapDonGia(db);
  const ten = await mapTenNhanSu(db);
  const buois = await query<any>(
    db,
    "SELECT gv_thuc_day_id AS gv, ngay_hoc FROM buoihoc WHERE trang_thai='đã_dạy'",
  );
  const dem: Record<string, number> = {};
  for (const b of buois) {
    if (kyStr(b.ngay_hoc) !== thang) continue;
    const gv = String(b.gv || "").trim();
    if (!gv) continue;
    dem[gv] = (dem[gv] || 0) + 1;
  }
  const paidRows = await query<any>(
    db,
    "SELECT gv_id, da_tra, ngay_tra FROM luong_gv WHERE ky=?",
    thang,
  );
  const paid: Record<string, any> = {};
  paidRows.forEach((r) => {
    paid[r.gv_id] = r;
  });

  const rows: any[] = [];
  for (const gv of Object.keys(dem)) {
    if (chiMinh && gv !== chiMinh) continue;
    const dg = rate[gv] || 0,
      sb = dem[gv];
    rows.push({
      gv_id: gv,
      ho_ten: ten[gv] || gv,
      so_buoi: sb,
      don_gia: dg,
      tong_luong: sb * dg,
      da_tra: !!(paid[gv] && paid[gv].da_tra === "rồi"),
      ngay_tra: paid[gv] ? paid[gv].ngay_tra : "",
    });
  }
  rows.sort((a, b) => (a.ho_ten < b.ho_ten ? -1 : 1));
  return { quyenTra: laQL, rows };
}

export async function traLuongGV(db: D1Database, p: any, user: SessionUser) {
  if (!coQuyenTra(user)) throw loi("Bạn không có quyền trả lương", 403);
  if (!p.nguoi_chi) throw loi("Chọn người trả lương (đối tác)");
  const gv = String(p.gv_id || "").trim(),
    thang = kyStr(p.thang);
  const tong = toInt(p.tong_luong),
    sb = toInt(p.so_buoi);
  if (!gv || !thang) throw loi("Thiếu thông tin");

  const ex = await one<any>(
    db,
    "SELECT luong_gv_id FROM luong_gv WHERE gv_id=? AND ky=?",
    gv,
    thang,
  );
  if (ex) {
    await run(
      db,
      "UPDATE luong_gv SET so_buoi_thuc_day=?, tong_luong=?, da_tra='rồi', ngay_tra=? WHERE luong_gv_id=?",
      sb,
      tong,
      todayVN(),
      ex.luong_gv_id,
    );
  } else {
    const id = "LGV" + gv + thang.replace("-", "");
    await run(
      db,
      "INSERT INTO luong_gv(luong_gv_id,gv_id,ky,so_buoi_thuc_day,tong_luong,da_tra,ngay_tra,ghi_chu) VALUES(?,?,?,?,?,?,?,?)",
      id,
      gv,
      thang,
      sb,
      tong,
      "rồi",
      todayVN(),
      "",
    );
  }
  const ten = (await mapTenNhanSu(db))[gv] || gv;
  await themChiNoiBo(
    db,
    "lương",
    "Lương GV " + ten + " tháng " + thang,
    tong,
    p.nguoi_chi,
  );
  return { ok: true };
}

/* ==================== HOA HỒNG ==================== */

export async function dsHoaHong(db: D1Database, _p: any, user: SessionUser) {
  const quyenChi = coQuyenTra(user);
  const tenNV = await mapTenNhanSu(db);
  const dtRows = await query<any>(
    db,
    "SELECT doitac_id, ten_doi_tac FROM doitac",
  );
  const tenDT: Record<string, string> = {};
  dtRows.forEach((r) => {
    tenDT[r.doitac_id] = r.ten_doi_tac;
  });
  const hvRows = await query<any>(
    db,
    "SELECT ma_dinh_danh, ho_ten_hv FROM hocvien",
  );
  const tenHV: Record<string, string> = {};
  hvRows.forEach((r) => {
    tenHV[r.ma_dinh_danh] = r.ho_ten_hv;
  });

  const rows = await query<any>(
    db,
    "SELECT * FROM hoahong ORDER BY (trang_thai = 'đã_chi'), hoahong_id DESC",
  );
  const out = rows.map((r) => {
    const ten =
      r.nguoi_gt_loai === "NHÂN_VIÊN"
        ? tenNV[r.nguoi_gt_id] || r.nguoi_gt_id
        : tenDT[r.nguoi_gt_id] || r.nguoi_gt_id;
    return {
      hoahong_id: r.hoahong_id,
      nguoi_gt: ten,
      nguoi_gt_loai: r.nguoi_gt_loai,
      ho_ten_hv: tenHV[r.ma_dinh_danh] || r.ma_dinh_danh,
      hinh_thuc: r.hinh_thuc,
      gia_tri: r.gia_tri,
      so_tien: toInt(r.so_tien),
      trang_thai: r.trang_thai,
      ngay_chi: r.ngay_chi,
    };
  });
  return { quyenChi, rows: out };
}

export async function chiHoaHong(db: D1Database, p: any, user: SessionUser) {
  if (!coQuyenTra(user)) throw loi("Bạn không có quyền chi hoa hồng", 403);
  if (!p.nguoi_chi) throw loi("Chọn người trả hoa hồng (đối tác)");
  const id = String(p.hoahong_id || "").trim();
  const hh = await one<any>(db, "SELECT * FROM hoahong WHERE hoahong_id=?", id);
  if (!hh) throw loi("Không tìm thấy khoản hoa hồng: " + id, 404);
  if (hh.trang_thai === "đã_chi") throw loi("Khoản này đã chi");
  if (hh.nguoi_gt_loai === "NHÂN_VIÊN")
    throw loi("Hoa hồng nhân viên được trả qua module Lương nhân viên");

  await run(
    db,
    "UPDATE hoahong SET trang_thai='đã_chi', ngay_chi=? WHERE hoahong_id=?",
    todayVN(),
    id,
  );
  const dt = await one<any>(
    db,
    "SELECT ten_doi_tac FROM doitac WHERE doitac_id=?",
    hh.nguoi_gt_id,
  );
  const ten = dt ? dt.ten_doi_tac : hh.nguoi_gt_id;
  await themChiNoiBo(
    db,
    "hoa hồng",
    "Hoa hồng cho " + ten + " (" + id + ")",
    toInt(hh.so_tien),
    p.nguoi_chi,
  );
  return { ok: true };
}

/* ==================== LƯƠNG NHÂN VIÊN ==================== */

async function mapLuongCung(db: D1Database): Promise<Record<string, number>> {
  const rows = await query<any>(
    db,
    "SELECT staff_id, luong_cung_thang FROM luongcung_nhansu WHERE id IN (SELECT MAX(id) FROM luongcung_nhansu GROUP BY staff_id)",
  );
  const m: Record<string, number> = {};
  rows.forEach((r) => {
    m[r.staff_id] = toInt(r.luong_cung_thang);
  });
  return m;
}

/** Tổng hoa hồng NHÂN_VIÊN đang chờ chi, theo staff. */
async function mapHoaHongChoChi(
  db: D1Database,
): Promise<Record<string, number>> {
  const rows = await query<any>(
    db,
    "SELECT nguoi_gt_id AS sid, so_tien FROM hoahong WHERE nguoi_gt_loai='NHÂN_VIÊN' AND trang_thai='chờ_chi'",
  );
  const m: Record<string, number> = {};
  rows.forEach((r) => {
    m[r.sid] = (m[r.sid] || 0) + toInt(r.so_tien);
  });
  return m;
}

export async function luongNV(db: D1Database, p: any, user: SessionUser) {
  const thang = kyStr(p.thang);
  const laQL = coQuyenTra(user);
  const lcMap = await mapLuongCung(db);
  const hhMap = await mapHoaHongChoChi(db);
  const ten = await mapTenNhanSu(db);

  const paidRows = await query<any>(
    db,
    "SELECT * FROM luong_nhansu WHERE ky=?",
    thang,
  );
  const paid: Record<string, any> = {};
  paidRows.forEach((r) => {
    paid[r.staff_id] = r;
  });

  const set: Record<string, boolean> = {};
  Object.keys(lcMap).forEach((s) => {
    if (lcMap[s] > 0) set[s] = true;
  });
  Object.keys(hhMap).forEach((s) => {
    set[s] = true;
  });
  Object.keys(paid).forEach((s) => {
    set[s] = true;
  });

  const rows = Object.keys(set).map((s) => {
    const pd = paid[s];
    if (pd && pd.da_tra === "rồi") {
      return {
        staff_id: s,
        ho_ten: ten[s] || s,
        luong_cung: toInt(pd.luong_cung),
        hoa_hong: toInt(pd.hoa_hong),
        tong: toInt(pd.tong),
        da_tra: true,
        ngay_tra: pd.ngay_tra,
      };
    }
    const lc = lcMap[s] || 0,
      hhv = hhMap[s] || 0;
    return {
      staff_id: s,
      ho_ten: ten[s] || s,
      luong_cung: lc,
      hoa_hong: hhv,
      tong: lc + hhv,
      da_tra: false,
      ngay_tra: "",
    };
  });
  rows.sort((a, b) => (a.ho_ten < b.ho_ten ? -1 : 1));
  return { quyenTra: laQL, rows };
}

export async function traLuongNV(db: D1Database, p: any, user: SessionUser) {
  if (!coQuyenTra(user)) throw loi("Bạn không có quyền trả lương", 403);
  if (!p.nguoi_chi) throw loi("Chọn người trả lương (đối tác)");
  const sid = String(p.staff_id || "").trim(),
    thang = kyStr(p.thang);
  if (!sid || !thang) throw loi("Thiếu thông tin");

  // 1) Chốt hoa hồng NV đang chờ chi của người này
  const hhRows = await query<any>(
    db,
    "SELECT hoahong_id, so_tien FROM hoahong WHERE nguoi_gt_loai='NHÂN_VIÊN' AND nguoi_gt_id=? AND trang_thai='chờ_chi'",
    sid,
  );
  let hoaHong = 0;
  for (const r of hhRows) {
    hoaHong += toInt(r.so_tien);
    await run(
      db,
      "UPDATE hoahong SET trang_thai='đã_chi', ngay_chi=? WHERE hoahong_id=?",
      todayVN(),
      r.hoahong_id,
    );
  }
  const luongCung = (await mapLuongCung(db))[sid] || 0;
  const tong = luongCung + hoaHong;

  // 2) Ghi bảng lương NV (upsert theo staff + kỳ)
  const ex = await one<any>(
    db,
    "SELECT luong_nv_id FROM luong_nhansu WHERE staff_id=? AND ky=?",
    sid,
    thang,
  );
  if (ex) {
    await run(
      db,
      "UPDATE luong_nhansu SET luong_cung=?, hoa_hong=?, tong=?, da_tra='rồi', ngay_tra=? WHERE luong_nv_id=?",
      luongCung,
      hoaHong,
      tong,
      todayVN(),
      ex.luong_nv_id,
    );
  } else {
    const id = "LNV" + sid + thang.replace("-", "");
    await run(
      db,
      "INSERT INTO luong_nhansu(luong_nv_id,staff_id,ky,luong_cung,hoa_hong,tong,da_tra,ngay_tra,ghi_chu) VALUES(?,?,?,?,?,?,?,?,?)",
      id,
      sid,
      thang,
      luongCung,
      hoaHong,
      tong,
      "rồi",
      todayVN(),
      "",
    );
  }

  // 3) Sinh Chi
  const ten = (await mapTenNhanSu(db))[sid] || sid;
  await themChiNoiBo(
    db,
    "lương",
    "Lương NV " +
      ten +
      " tháng " +
      thang +
      (hoaHong > 0 ? " (gồm hoa hồng)" : ""),
    tong,
    p.nguoi_chi,
  );
  return { ok: true };
}
