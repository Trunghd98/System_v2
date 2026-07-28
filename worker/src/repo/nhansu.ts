import { query, run, nextSeq, pad, loi, toInt, todayVN } from "../db";
import { VAITRO_HOPLE } from "../schema";

function locVaiTro(v: any): string[] {
  return (Array.isArray(v) ? v : [])
    .map(String)
    .filter((r) => VAITRO_HOPLE.includes(r));
}

/** Danh sách nhân sự kèm vai trò + lương cứng + đơn giá GV hiện hành. */
export async function dsNhanSu(db: D1Database) {
  const ns = await query<any>(db, "SELECT * FROM nhansu ORDER BY staff_id");
  const vt = await query<any>(
    db,
    "SELECT staff_id, vai_tro FROM nhansu_vaitro",
  );
  const lc = await query<any>(
    db,
    "SELECT staff_id, luong_cung_thang FROM luongcung_nhansu WHERE id IN (SELECT MAX(id) FROM luongcung_nhansu GROUP BY staff_id)",
  );
  const dg = await query<any>(
    db,
    "SELECT gv_id, don_gia_buoi FROM dongia_gv WHERE (lop_id IS NULL OR lop_id='') AND id IN (SELECT MAX(id) FROM dongia_gv WHERE (lop_id IS NULL OR lop_id='') GROUP BY gv_id)",
  );

  const roleMap: Record<string, string[]> = {};
  vt.forEach((r) => {
    (roleMap[r.staff_id] ||= []).push(r.vai_tro);
  });
  const lcMap: Record<string, number> = {};
  lc.forEach((r) => {
    lcMap[r.staff_id] = r.luong_cung_thang;
  });
  const dgMap: Record<string, number> = {};
  dg.forEach((r) => {
    dgMap[r.gv_id] = r.don_gia_buoi;
  });

  return ns.map((n) => ({
    ...n,
    vaiTro: roleMap[n.staff_id] || [],
    luong_cung: lcMap[n.staff_id] ?? null,
    don_gia_buoi: dgMap[n.staff_id] ?? null,
  }));
}

export async function themNhanSu(db: D1Database, p: any) {
  const ho_ten = String(p.ho_ten || "").trim();
  if (!ho_ten) throw loi("Thiếu họ tên");
  const gmail = String(p.gmail || "")
    .trim()
    .toLowerCase();
  const seq = await nextSeq(db, "SEQ_NHANSU");
  const staff_id = "NS" + pad(seq, 3);
  await run(
    db,
    "INSERT INTO nhansu(staff_id,ho_ten,gmail,co_luong_cung,co_day,trang_thai,ngay_tao,la_doi_tac_ln) VALUES(?,?,?,?,?,?,?,?)",
    staff_id,
    ho_ten,
    gmail,
    p.co_luong_cung || "không",
    p.co_day || "không",
    "đang_làm",
    todayVN(),
    p.la_doi_tac_ln || "không",
  );
  for (const v of locVaiTro(p.vaiTro))
    await run(
      db,
      "INSERT INTO nhansu_vaitro(staff_id,vai_tro) VALUES(?,?)",
      staff_id,
      v,
    );
  return { staff_id };
}

export async function capNhatNhanSu(db: D1Database, p: any) {
  const staff_id = String(p.staff_id || "").trim();
  if (!staff_id) throw loi("Thiếu staff_id");
  await run(
    db,
    "UPDATE nhansu SET ho_ten=?, gmail=?, co_luong_cung=?, co_day=?, trang_thai=?, la_doi_tac_ln=? WHERE staff_id=?",
    String(p.ho_ten || "").trim(),
    String(p.gmail || "")
      .trim()
      .toLowerCase(),
    p.co_luong_cung || "không",
    p.co_day || "không",
    p.trang_thai || "đang_làm",
    p.la_doi_tac_ln || "không",
    staff_id,
  );
  if (Array.isArray(p.vaiTro)) {
    await run(db, "DELETE FROM nhansu_vaitro WHERE staff_id=?", staff_id);
    for (const v of locVaiTro(p.vaiTro))
      await run(
        db,
        "INSERT INTO nhansu_vaitro(staff_id,vai_tro) VALUES(?,?)",
        staff_id,
        v,
      );
  }
  return { ok: true };
}

export async function setLuongCung(db: D1Database, p: any) {
  const staff_id = String(p.staff_id || "").trim();
  if (!staff_id) throw loi("Thiếu staff_id");
  await run(
    db,
    "INSERT INTO luongcung_nhansu(staff_id,luong_cung_thang,hieu_luc_tu,ghi_chu) VALUES(?,?,?,?)",
    staff_id,
    toInt(p.luong_cung_thang),
    p.hieu_luc_tu || todayVN(),
    p.ghi_chu || "",
  );
  return { ok: true };
}

export async function setDonGia(db: D1Database, p: any) {
  const gv_id = String(p.gv_id || "").trim();
  if (!gv_id) throw loi("Thiếu gv_id");
  await run(
    db,
    "INSERT INTO dongia_gv(gv_id,lop_id,don_gia_buoi,hieu_luc_tu,ghi_chu) VALUES(?,?,?,?,?)",
    gv_id,
    p.lop_id || "",
    toInt(p.don_gia_buoi),
    p.hieu_luc_tu || todayVN(),
    p.ghi_chu || "",
  );
  return { ok: true };
}
