import { query, toInt } from "../db";
import { doiSoat } from "./ketoan";

function kyStr(v: unknown): string {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + "-" + m[2] : s;
}
function ptram(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}
function sauThang(thang: string): string[] {
  const m = thang.match(/^(\d{4})-(\d{2})/);
  if (!m) return [];
  const y = +m[1],
    mo = +m[2],
    out: string[] = [];
  for (let i = 5; i >= 0; i--) {
    let yy = y,
      mm = mo - i;
    while (mm <= 0) {
      mm += 12;
      yy--;
    }
    out.push(yy + "-" + String(mm).padStart(2, "0"));
  }
  return out;
}
async function mapTen(db: D1Database): Promise<Record<string, string>> {
  const ns = await query<any>(
    db,
    "SELECT staff_id AS id, ho_ten AS ten FROM nhansu",
  );
  const dt = await query<any>(
    db,
    "SELECT doitac_id AS id, ten_doi_tac AS ten FROM doitac",
  );
  const m: Record<string, string> = {};
  ns.forEach((r) => {
    m[r.id] = r.ten;
  });
  dt.forEach((r) => {
    m[r.id] = r.ten;
  });
  return m;
}

export async function dashboard(db: D1Database, p: any) {
  const thang = kyStr(p.thang);
  const tenDT = await mapTen(db);

  // ---- Thu (học phí đã thu + thu khác) & công nợ ----
  const thuByThang: Record<string, number> = {},
    thuTheoNguoi: Record<string, number> = {},
    thuLKNguoi: Record<string, number> = {};
  let thuLK = 0,
    thuThang = 0,
    congNoTon = 0;
  const congNoHV: Record<string, boolean> = {};
  for (const r of await query<any>(db, "SELECT * FROM hocphi")) {
    if (!r.hocphi_id) continue;
    const phai = toInt(r.so_tien_phai_dong),
      da = toInt(r.so_tien_da_dong);
    if (r.trang_thai === "đã_đóng") {
      const th = kyStr(r.ngay_dong),
        ng = String(r.nguoi_xac_nhan || "").trim();
      thuByThang[th] = (thuByThang[th] || 0) + da;
      thuLK += da;
      thuLKNguoi[ng] = (thuLKNguoi[ng] || 0) + da;
      if (th === thang) {
        thuThang += da;
        thuTheoNguoi[ng] = (thuTheoNguoi[ng] || 0) + da;
      }
    } else if (phai - da > 0) {
      congNoTon += phai - da;
      congNoHV[r.ma_dinh_danh] = true;
    }
  }
  for (const r of await query<any>(db, "SELECT * FROM thu_khac")) {
    if (!r.thu_id) continue;
    const stk = toInt(r.so_tien),
      thk = kyStr(r.ngay),
      ngk = String(r.nguoi_thu || "").trim();
    thuByThang[thk] = (thuByThang[thk] || 0) + stk;
    thuLK += stk;
    thuLKNguoi[ngk] = (thuLKNguoi[ngk] || 0) + stk;
    if (thk === thang) {
      thuThang += stk;
      thuTheoNguoi[ngk] = (thuTheoNguoi[ngk] || 0) + stk;
    }
  }

  // ---- Chi ----
  const chiByThang: Record<string, number> = {},
    chiTheoLoai: Record<string, number> = {};
  let chiLK = 0,
    chiThang = 0,
    tongLuongLK = 0,
    tongHoaHongLK = 0;
  for (const r of await query<any>(db, "SELECT * FROM chi")) {
    if (!r.chi_id) continue;
    const st = toInt(r.so_tien),
      th = kyStr(r.ngay),
      loai = String(r.loai || "khác").trim();
    chiByThang[th] = (chiByThang[th] || 0) + st;
    chiLK += st;
    if (loai === "lương") tongLuongLK += st;
    if (loai === "hoa hồng") tongHoaHongLK += st;
    if (th === thang) {
      chiThang += st;
      chiTheoLoai[loai] = (chiTheoLoai[loai] || 0) + st;
    }
  }

  // ---- Tuyển sinh ----
  const pheu: Record<string, number> = {};
  let tongLead = 0,
    leadMoiThang = 0;
  for (const r of await query<any>(db, "SELECT * FROM hocvien")) {
    if (!r.ma_dinh_danh) continue;
    tongLead++;
    const stt = String(r.trang_thai || "").trim();
    pheu[stt] = (pheu[stt] || 0) + 1;
    if (kyStr(r.ngay_tao) === thang) leadMoiThang++;
  }
  const ghiDanhByThang: Record<string, number> = {},
    hvGhiDanh: Record<string, boolean> = {};
  let tongGhiDanh = 0,
    ghiDanhMoiThang = 0;
  for (const r of await query<any>(db, "SELECT * FROM ghidanh")) {
    if (!r.ghidanh_id) continue;
    tongGhiDanh++;
    hvGhiDanh[r.ma_dinh_danh] = true;
    const thg = kyStr(r.ngay_ghidanh);
    ghiDanhByThang[thg] = (ghiDanhByThang[thg] || 0) + 1;
    if (thg === thang) ghiDanhMoiThang++;
  }
  const soHvGhiDanh = Object.keys(hvGhiDanh).length;

  // ---- Vận hành ----
  const lopTT: Record<string, number> = {};
  let tongLopDaMo = 0;
  for (const r of await query<any>(db, "SELECT * FROM lop")) {
    if (!r.lop_id) continue;
    tongLopDaMo++;
    const s = String(r.trang_thai || "").trim();
    lopTT[s] = (lopTT[s] || 0) + 1;
  }
  const hvSet: Record<string, boolean> = {};
  for (const r of await query<any>(
    db,
    "SELECT ma_dinh_danh FROM lop_hocvien WHERE trang_thai!='đã_rời'",
  ))
    if (r.ma_dinh_danh) hvSet[r.ma_dinh_danh] = true;
  const hvDangHoc = Object.keys(hvSet).length;
  const buoiThang: Record<string, number> = { đã_dạy: 0, cả_lớp_nghỉ: 0 };
  let tongBuoiDaDay = 0;
  for (const r of await query<any>(db, "SELECT * FROM buoihoc")) {
    if (!r.buoi_id) continue;
    const s = String(r.trang_thai || "").trim();
    if (s === "đã_dạy") tongBuoiDaDay++;
    if (kyStr(r.ngay_hoc) === thang && buoiThang[s] != null) buoiThang[s]++;
  }

  // ---- Hoa hồng đối tác chờ chi ----
  let hoaHongChoDT = 0;
  for (const r of await query<any>(
    db,
    "SELECT so_tien FROM hoahong WHERE trang_thai='chờ_chi' AND nguoi_gt_loai='ĐỐI_TÁC'",
  ))
    hoaHongChoDT += toInt(r.so_tien);

  // ---- Xu hướng 6 tháng ----
  const xuHuong = sauThang(thang).map((m) => {
    const t = thuByThang[m] || 0,
      c = chiByThang[m] || 0;
    return {
      thang: m,
      thu: t,
      chi: c,
      ln: t - c,
      ghiDanh: ghiDanhByThang[m] || 0,
    };
  });

  const thuNguoiArr = Object.keys(thuTheoNguoi).map((k) => ({
    ten: tenDT[k] || k,
    so_tien: thuTheoNguoi[k],
  }));
  const thuLKNguoiArr = Object.keys(thuLKNguoi)
    .map((k) => ({ ten: tenDT[k] || k, so_tien: thuLKNguoi[k] }))
    .sort((a, b) => b.so_tien - a.so_tien);
  const chiLoaiArr = Object.keys(chiTheoLoai)
    .map((k) => ({ loai: k, so_tien: chiTheoLoai[k] }))
    .sort((a, b) => b.so_tien - a.so_tien);
  const soThangHD = Object.keys(thuByThang).length;

  let ds: any = null;
  try {
    ds = await doiSoat(db, { thang });
  } catch (e) {
    ds = null;
  }

  return {
    thang,
    kpi: {
      thuThang,
      chiThang,
      lnThang: thuThang - chiThang,
      congNoTon,
      congNoSoHV: Object.keys(congNoHV).length,
      hvDangHoc,
      leadMoiThang,
      ghiDanhMoiThang,
    },
    luyKe: {
      thuLK,
      chiLK,
      lnLK: thuLK - chiLK,
      bienLoiNhuan: ptram(thuLK - chiLK, thuLK),
      dtTrungBinhThang: soThangHD > 0 ? Math.round(thuLK / soThangHD) : 0,
      soThangHoatDong: soThangHD,
      congNoTon,
      tiLeThuHoi: ptram(thuLK, thuLK + congNoTon),
      tongLead,
      tongGhiDanh,
      tiLeChot: ptram(tongGhiDanh, tongLead),
      dtTrungBinhHV: soHvGhiDanh > 0 ? Math.round(thuLK / soHvGhiDanh) : 0,
      soHvGhiDanh,
      tongLopDaMo,
      tongBuoiDaDay,
      tongLuongLK,
      tiTrongLuong: ptram(tongLuongLK, chiLK),
      tongHoaHongLK,
      tiTrongHoaHong: ptram(tongHoaHongLK, chiLK),
    },
    canDoiDoiTac: thuLKNguoiArr,
    xuHuong,
    pheuLead: pheu,
    tyLeChuyenDoi: ptram(
      (pheu["đã_đăng_ký"] || 0) + (pheu["đang_học"] || 0),
      tongLead,
    ),
    lopTheoTrangThai: lopTT,
    buoiThang,
    thuTheoNguoi: thuNguoiArr,
    chiTheoLoai: chiLoaiArr,
    hoaHongChoChiDoiTac: hoaHongChoDT,
    doiSoat: ds,
  };
}
