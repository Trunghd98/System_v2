import { query, one, run, nextSeq, pad, loi, toInt, todayVN } from "../db";

function kyStr(v: unknown): string {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + "-" + m[2] : s;
}
function nhanThang(ky: string): string {
  const m = ky.match(/^(\d{4})-(\d{2})/);
  return m ? "T" + Number(m[2]) + "/" + m[1] : ky;
}
function tienVN(n: number): string {
  return (Number(n) || 0).toLocaleString("vi-VN");
}

/* ==================== SINH KHOẢN PHẢI THU ====================
 *  TRỌN_KHÓA      : 1 lần = gia_cuoi (theo tháng ghi danh)
 *  THÁNG          : số buổi CÓ MẶT × đơn giá/buổi (gia_buoi_rieng)
 *  THÁNG_CỐ_ĐỊNH  : số tiền cố định mỗi tháng lớp có chạy (gia_buoi_rieng, dự phòng gia_cuoi)
 * ============================================================ */
export async function sinhKhoanPhaiThu(db: D1Database, p: any) {
  const thang = kyStr(p.thang);
  if (!/^\d{4}-\d{2}$/.test(thang)) throw loi("Tháng không hợp lệ (yyyy-MM)");

  const hpRows = await query<any>(
    db,
    "SELECT hocphi_id, ghidanh_id, ky, trang_thai FROM hocphi",
  );
  const billMap: Record<string, { id: string; tt: string }> = {};
  for (const r of hpRows)
    billMap[r.ghidanh_id + "|" + kyStr(r.ky)] = {
      id: r.hocphi_id,
      tt: r.trang_thai,
    };

  const gds = await query<any>(db, "SELECT * FROM ghidanh");
  const htMap: Record<string, string> = {};
  const giaCuoiMap: Record<string, number> = {};
  gds.forEach((g) => {
    htMap[g.ghidanh_id] = g.hinh_thuc_dong;
    giaCuoiMap[g.ghidanh_id] = toInt(g.gia_cuoi);
  });

  let taoMoi = 0,
    capNhat = 0;

  const themKhoan = async (
    ma: string,
    gid: string,
    so_buoi: number,
    gia_buoi: number,
    phai: number,
  ) => {
    const id = "HP" + pad(await nextSeq(db, "SEQ_HOCPHI"), 6);
    await run(
      db,
      "INSERT INTO hocphi(hocphi_id,ma_dinh_danh,ghidanh_id,ky,so_buoi_tinh,gia_buoi,so_tien_phai_dong,so_tien_da_dong,trang_thai) VALUES(?,?,?,?,?,?,?,?,?)",
      id,
      ma,
      gid,
      thang,
      so_buoi,
      gia_buoi,
      phai,
      0,
      "chưa_đóng",
    );
    billMap[gid + "|" + thang] = { id, tt: "chưa_đóng" };
    taoMoi++;
  };
  const capNhatHoacTao = async (
    gid: string,
    ma: string,
    so_buoi: number,
    gia_buoi: number,
    phai: number,
  ) => {
    const ex = billMap[gid + "|" + thang];
    if (ex) {
      if (ex.tt === "đã_đóng") return;
      await run(
        db,
        "UPDATE hocphi SET so_buoi_tinh=?, gia_buoi=?, so_tien_phai_dong=? WHERE hocphi_id=?",
        so_buoi,
        gia_buoi,
        phai,
        ex.id,
      );
      capNhat++;
    } else {
      await themKhoan(ma, gid, so_buoi, gia_buoi, phai);
    }
  };

  // 1) TRỌN KHÓA
  for (const g of gds) {
    if (g.hinh_thuc_dong !== "TRỌN_KHÓA") continue;
    if (kyStr(g.ngay_ghidanh) !== thang) continue;
    if (billMap[g.ghidanh_id + "|" + thang]) continue;
    await themKhoan(g.ma_dinh_danh, g.ghidanh_id, 0, 0, toInt(g.gia_cuoi));
  }

  // Buổi/điểm danh trong tháng
  const buois = await query<any>(
    db,
    "SELECT buoi_id, lop_id, ngay_hoc FROM buoihoc WHERE trang_thai='đã_dạy'",
  );
  const buoiThang: Record<string, string> = {};
  for (const b of buois)
    if (kyStr(b.ngay_hoc) === thang) buoiThang[b.buoi_id] = b.lop_id;
  const soBuoiLopThang: Record<string, number> = {};
  const lopChayThang = new Set<string>();
  for (const lop of Object.values(buoiThang)) {
    soBuoiLopThang[lop] = (soBuoiLopThang[lop] || 0) + 1;
    lopChayThang.add(lop);
  }
  const dds = await query<any>(
    db,
    "SELECT buoi_id, ma_dinh_danh FROM diemdanh WHERE trang_thai='có_mặt'",
  );
  const coMat: Record<string, number> = {};
  for (const d of dds) {
    const lop = buoiThang[d.buoi_id];
    if (!lop) continue;
    coMat[lop + "|" + d.ma_dinh_danh] =
      (coMat[lop + "|" + d.ma_dinh_danh] || 0) + 1;
  }

  const lhvs = await query<any>(
    db,
    "SELECT * FROM lop_hocvien WHERE trang_thai!='đã_rời'",
  );
  for (const lh of lhvs) {
    const ht = htMap[lh.ghidanh_id];
    if (ht === "THÁNG") {
      const sobuoi = coMat[lh.lop_id + "|" + lh.ma_dinh_danh] || 0;
      if (sobuoi <= 0) continue;
      const gia = toInt(lh.gia_buoi_rieng);
      await capNhatHoacTao(
        lh.ghidanh_id,
        lh.ma_dinh_danh,
        sobuoi,
        gia,
        sobuoi * gia,
      );
    } else if (ht === "THÁNG_CỐ_ĐỊNH") {
      if (!lopChayThang.has(lh.lop_id)) continue;
      const phai = toInt(lh.gia_buoi_rieng) || giaCuoiMap[lh.ghidanh_id] || 0;
      if (phai <= 0) continue;
      await capNhatHoacTao(
        lh.ghidanh_id,
        lh.ma_dinh_danh,
        soBuoiLopThang[lh.lop_id] || 0,
        0,
        phai,
      );
    }
  }
  return { taoMoi, capNhat };
}

/* ==================== CÔNG NỢ (gộp theo học viên, cộng dồn nợ cũ) ==================== */
export async function dsCongNo(db: D1Database, p: any) {
  const thang = kyStr(p.thang);
  const rows = await query<any>(
    db,
    `SELECT hp.*, h.ho_ten_hv AS ho_ten, g.hinh_thuc_dong AS loai
       FROM hocphi hp
       LEFT JOIN hocvien h ON h.ma_dinh_danh = hp.ma_dinh_danh
       LEFT JOIN ghidanh g ON g.ghidanh_id = hp.ghidanh_id
      WHERE substr(hp.ky, 1, 7) <= ?
      ORDER BY hp.ma_dinh_danh, hp.ky, hp.hocphi_id`,
    thang,
  );

  const byHV: Record<string, any> = {};
  for (const r of rows) {
    const ma = r.ma_dinh_danh;
    if (!byHV[ma])
      byHV[ma] = {
        ma_dinh_danh: ma,
        ho_ten: r.ho_ten || ma,
        loai: "",
        ky: thang,
        phai_dong_ky: 0,
        da_dong_ky: 0,
        no_cu: 0,
        ghi_chu_no: [] as string[],
        trang_thai_ky: "",
      };
    const o = byHV[ma];
    const ky = kyStr(r.ky);
    const phai = toInt(r.so_tien_phai_dong),
      da = toInt(r.so_tien_da_dong);
    const con = Math.max(phai - da, 0);
    if (ky === thang) {
      o.phai_dong_ky += phai;
      o.da_dong_ky += da;
      o.loai = r.loai || o.loai;
      o.trang_thai_ky = r.trang_thai;
    } else if (r.trang_thai !== "đã_đóng" && con > 0) {
      o.no_cu += con;
      o.ghi_chu_no.push(nhanThang(ky) + ": " + tienVN(con));
    }
  }

  return Object.values(byHV)
    .filter((o: any) => o.phai_dong_ky > 0 || o.no_cu > 0)
    .map((o: any) => {
      const con_lai_ky = Math.max(o.phai_dong_ky - o.da_dong_ky, 0);
      return {
        ma_dinh_danh: o.ma_dinh_danh,
        ho_ten: o.ho_ten,
        loai: o.loai,
        ky: thang,
        phai_dong_ky: o.phai_dong_ky,
        da_dong_ky: o.da_dong_ky,
        con_lai_ky,
        no_cu: o.no_cu,
        tong_can_thu: con_lai_ky + o.no_cu,
        ghi_chu_no: o.ghi_chu_no.join(" · "),
        trang_thai_ky: o.trang_thai_ky,
      };
    });
}

/* ==================== THU TIỀN ==================== */

/** Thu lẻ một khoản theo hocphi_id. */
export async function danhDauThu(db: D1Database, p: any) {
  const hpid = String(p.hocphi_id || "").trim();
  if (!hpid) throw loi("Thiếu hocphi_id");
  if (!p.nguoi_thu) throw loi("Chọn người thu");
  const hp = await one<any>(
    db,
    "SELECT so_tien_phai_dong FROM hocphi WHERE hocphi_id=?",
    hpid,
  );
  if (!hp) throw loi("Không tìm thấy khoản phải thu: " + hpid, 404);
  await run(
    db,
    "UPDATE hocphi SET so_tien_da_dong=?, ngay_dong=?, nguoi_xac_nhan=?, trang_thai=? WHERE hocphi_id=?",
    toInt(hp.so_tien_phai_dong),
    p.ngay_thu || todayVN(),
    p.nguoi_thu,
    "đã_đóng",
    hpid,
  );
  return { ok: true };
}

/** Thu gộp: gạch tất cả khoản chưa đóng của học viên (tới tháng xem), từ cũ nhất. */
export async function thuGop(db: D1Database, p: any) {
  const ma = String(p.ma_dinh_danh || "").trim();
  if (!ma) throw loi("Thiếu ma_dinh_danh");
  if (!p.nguoi_thu) throw loi("Chọn người thu");
  const thang = kyStr(p.thang);
  const ngay = p.ngay_thu || todayVN();
  const rows = await query<any>(
    db,
    "SELECT hocphi_id, so_tien_phai_dong, so_tien_da_dong FROM hocphi WHERE ma_dinh_danh=? AND substr(ky,1,7)<=? AND trang_thai!='đã_đóng' ORDER BY ky, hocphi_id",
    ma,
    thang,
  );
  let tong = 0,
    dem = 0;
  for (const r of rows) {
    const con = Math.max(
      toInt(r.so_tien_phai_dong) - toInt(r.so_tien_da_dong),
      0,
    );
    if (con <= 0) continue;
    await run(
      db,
      "UPDATE hocphi SET so_tien_da_dong=so_tien_phai_dong, ngay_dong=?, nguoi_xac_nhan=?, trang_thai=? WHERE hocphi_id=?",
      ngay,
      p.nguoi_thu,
      "đã_đóng",
      r.hocphi_id,
    );
    tong += con;
    dem++;
  }
  if (dem === 0) throw loi("Học viên không còn khoản nào để thu");
  return { ok: true, so_khoan: dem, tong_thu: tong };
}

/* ==================== THU KHÁC ==================== */

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

export async function themThuKhac(db: D1Database, p: any) {
  const so_tien = toInt(p.so_tien);
  if (so_tien <= 0) throw loi("Nhập số tiền hợp lệ");
  if (!p.nguoi_thu) throw loi("Chọn người thu");
  const thu_id = "TK" + pad(await nextSeq(db, "SEQ_THUKHAC"), 5);
  await run(
    db,
    "INSERT INTO thu_khac(thu_id,ngay,loai,noi_dung,so_tien,nguoi_thu,ghi_chu) VALUES(?,?,?,?,?,?,?)",
    thu_id,
    p.ngay || todayVN(),
    p.loai || "khác",
    p.noi_dung || "",
    so_tien,
    p.nguoi_thu,
    p.ghi_chu || "",
  );
  return { thu_id };
}

export async function dsThuKhac(db: D1Database, p: any) {
  const thang = kyStr(p.thang);
  const ten = await mapTen(db);
  const rows = thang
    ? await query<any>(
        db,
        "SELECT * FROM thu_khac WHERE substr(ngay,1,7)=? ORDER BY ngay DESC, thu_id DESC",
        thang,
      )
    : await query<any>(
        db,
        "SELECT * FROM thu_khac ORDER BY ngay DESC, thu_id DESC",
      );
  return rows.map((r) => ({
    thu_id: r.thu_id,
    ngay: r.ngay,
    loai: r.loai,
    noi_dung: r.noi_dung,
    so_tien: toInt(r.so_tien),
    nguoi_thu_id: r.nguoi_thu,
    nguoi_thu_ten: ten[r.nguoi_thu] || r.nguoi_thu,
    ghi_chu: r.ghi_chu,
  }));
}

/* ==================== CHI ==================== */

export async function themChi(db: D1Database, p: any) {
  const so_tien = toInt(p.so_tien);
  if (so_tien <= 0) throw loi("Nhập số tiền hợp lệ");
  if (!String(p.noi_dung || "").trim()) throw loi("Nhập nội dung chi");
  if (!p.nguoi_chi) throw loi("Chọn người chi");
  const chi_id = "CHI" + pad(await nextSeq(db, "SEQ_CHI"), 5);
  await run(
    db,
    "INSERT INTO chi(chi_id,ngay,loai,noi_dung,so_tien,nguoi_chi,ghi_chu) VALUES(?,?,?,?,?,?,?)",
    chi_id,
    p.ngay || todayVN(),
    p.loai || "khác",
    String(p.noi_dung).trim(),
    so_tien,
    p.nguoi_chi,
    p.ghi_chu || "",
  );
  return { chi_id };
}

export async function dsChi(db: D1Database, p: any) {
  const thang = kyStr(p.thang);
  const ten = await mapTen(db);
  const rows = thang
    ? await query<any>(
        db,
        "SELECT * FROM chi WHERE substr(ngay,1,7)=? ORDER BY ngay DESC, chi_id DESC",
        thang,
      )
    : await query<any>(db, "SELECT * FROM chi ORDER BY ngay DESC, chi_id DESC");
  return rows.map((r) => ({
    chi_id: r.chi_id,
    ngay: r.ngay,
    loai: r.loai,
    noi_dung: r.noi_dung,
    so_tien: toInt(r.so_tien),
    nguoi_chi_id: r.nguoi_chi,
    nguoi_chi_ten: ten[r.nguoi_chi] || r.nguoi_chi,
    ghi_chu: r.ghi_chu,
  }));
}

/* ==================== ĐỐI SOÁT ==================== */

export async function dsDoiTacLN(db: D1Database) {
  return query<any>(
    db,
    "SELECT staff_id, ho_ten FROM nhansu WHERE la_doi_tac_ln='có' AND trang_thai='đang_làm' ORDER BY staff_id",
  );
}

export async function doiSoat(db: D1Database, p: any) {
  const thang = kyStr(p.thang);
  const dt = await dsDoiTacLN(db);
  if (!dt.length)
    throw loi(
      "Chưa đánh dấu đối tác lợi nhuận nào (Nhân sự: la_doi_tac_ln=có)",
    );

  const thu = await query<any>(
    db,
    "SELECT so_tien_da_dong AS so_tien, nguoi_xac_nhan AS ng FROM hocphi WHERE trang_thai='đã_đóng' AND substr(ngay_dong,1,7)=?",
    thang,
  );
  const thuK = await query<any>(
    db,
    "SELECT so_tien, nguoi_thu AS ng FROM thu_khac WHERE substr(ngay,1,7)=?",
    thang,
  );
  const chi = await query<any>(
    db,
    "SELECT so_tien, nguoi_chi AS ng FROM chi WHERE substr(ngay,1,7)=?",
    thang,
  );

  const thuMap: Record<string, number> = {},
    chiMap: Record<string, number> = {};
  let tongThu = 0,
    tongChi = 0;
  for (const t of thu) {
    thuMap[t.ng] = (thuMap[t.ng] || 0) + toInt(t.so_tien);
    tongThu += toInt(t.so_tien);
  }
  for (const t of thuK) {
    thuMap[t.ng] = (thuMap[t.ng] || 0) + toInt(t.so_tien);
    tongThu += toInt(t.so_tien);
  }
  for (const c of chi) {
    chiMap[c.ng] = (chiMap[c.ng] || 0) + toInt(c.so_tien);
    tongChi += toInt(c.so_tien);
  }

  const loiNhuan = tongThu - tongChi;
  const phan = Math.round(loiNhuan / dt.length);

  const rows = dt.map((pp) => {
    const thu_p = thuMap[pp.staff_id] || 0,
      chi_p = chiMap[pp.staff_id] || 0;
    const dangCam = thu_p - chi_p;
    return {
      staff_id: pp.staff_id,
      ho_ten: pp.ho_ten,
      thu: thu_p,
      chi: chi_p,
      dangCam,
      phanDuoc: phan,
      chenh: dangCam - phan,
    };
  });

  const du: any[] = [],
    thieu: any[] = [];
  rows.forEach((r) => {
    if (r.chenh > 0) du.push({ ten: r.ho_ten, amt: r.chenh });
    else if (r.chenh < 0) thieu.push({ ten: r.ho_ten, amt: -r.chenh });
  });
  const giaoDich: any[] = [];
  let i = 0,
    j = 0;
  while (i < du.length && j < thieu.length) {
    const m = Math.min(du[i].amt, thieu[j].amt);
    if (m >= 1)
      giaoDich.push({
        tu_ten: du[i].ten,
        den_ten: thieu[j].ten,
        so_tien: Math.round(m),
      });
    du[i].amt -= m;
    thieu[j].amt -= m;
    if (du[i].amt < 1) i++;
    if (thieu[j].amt < 1) j++;
  }

  return {
    thang,
    rows,
    tongThu,
    tongChi,
    loiNhuan,
    phanMoiNguoi: phan,
    giaoDich,
  };
}
