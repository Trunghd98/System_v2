#!/usr/bin/env node
/**
 * MIGRATE Phase 1 (Google Sheets CSV) → Cloudflare D1
 *
 * Dùng:
 *   1) Xuất từng sheet ra CSV, đặt vào scripts/data/<TÊN_SHEET>.csv
 *      (VD: scripts/data/NHANSU.csv, scripts/data/HOCPHI.csv ...)
 *   2) node scripts/migrate.mjs
 *   3) Xem scripts/out/seed.sql rồi nạp:
 *        npx wrangler d1 execute tcnf --local  --file=./scripts/out/seed.sql
 *        npx wrangler d1 execute tcnf --remote --file=./scripts/out/seed.sql
 *
 * Không cần Service Account. Chuẩn hóa: ngày → yyyy-MM-dd, ky → yyyy-MM, tiền → số.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const OUT_DIR = path.join(__dirname, 'out');
const OUT_FILE = path.join(OUT_DIR, 'seed.sql');

/* ---------------- CSV parser (hỗ trợ dấu phẩy trong ngoặc kép, xuống dòng trong ô) ---------------- */
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, ''); // bỏ BOM
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\r') { /* bỏ */ }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function readSheet(name) {
  const p = path.join(DATA_DIR, `${name}.csv`);
  if (!fs.existsSync(p)) return null;
  const rows = parseCSV(fs.readFileSync(p, 'utf8'));
  if (!rows.length) return { header: [], rows: [] };
  const header = rows[0].map((h) => h.trim());
  const body = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
  return { header, rows: body.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()]))) };
}

/* ---------------- Chuẩn hóa giá trị ---------------- */
const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

/** Trả 'yyyy-MM-dd' hoặc '' */
function toDate(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  if (!s) return '';
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))            // yyyy-MM-dd / ISO
    return `${m[1]}-${p2(m[2])}-${p2(m[3])}`;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)))          // dd/MM/yyyy
    return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  if ((m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/)))            // dd-MM-yyyy
    return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  const d = new Date(s);                                        // "Jun 4, 2026", v.v.
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  return s;
}

/** Trả 'yyyy-MM' hoặc '' */
function toKy(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) return `${m[1]}-${p2(m[2])}`;
  const d = toDate(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d.slice(0, 7);
  return s;
}

/** Trả 'yyyy-MM-dd HH:mm' hoặc '' (cho thoi_gian) */
function toDateTime(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const d = new Date(s);
  if (!isNaN(d.getTime()))
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return toDate(s);
}

/** Số nguyên (bỏ dấu chấm/phẩy/đ) */
function toInt(v) {
  const s = String(v ?? '').replace(/[^\d-]/g, '');
  if (!s || s === '-') return 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function p2(n) { return String(n).padStart(2, '0'); }
function esc(v) { return `'${String(v ?? '').replace(/'/g, "''")}'`; }
function sqlVal(v) { return typeof v === 'number' ? String(v) : esc(v); }

/* ---------------- Ánh xạ sheet → bảng ---------------- */
// type: T=text, D=date(yyyy-MM-dd), K=ky(yyyy-MM), N=number, DT=datetime
const MAP = [
  { sheet: 'NHANSU', table: 'nhansu', cols: {
    staff_id:'T', ho_ten:'T', gmail:'T', co_luong_cung:'T', co_day:'T', trang_thai:'T', ngay_tao:'D', la_doi_tac_ln:'T' } },

  { sheet: 'NHANSU_VAITRO', table: 'nhansu_vaitro', skipCols:['id'], cols: {
    staff_id:'T', vai_tro:'T', ghi_chu:'T' } },

  { sheet: 'DOITAC', table: 'doitac', skipCols:['lien_ket_nhansu_id'], cols: {
    doitac_id:'T', ten_doi_tac:'T', lien_he:'T', ghi_chu:'T', trang_thai:'T', ngay_tao:'D' } },

  { sheet: 'KHOAHOC', table: 'khoahoc', cols: {
    khoa_id:'T', ten_khoa:'T', ngon_ngu:'T', loai:'T', so_buoi_mac_dinh:'N', gia_goc_mac_dinh:'N', trang_thai:'T' } },

  { sheet: 'HOCVIEN', table: 'hocvien', cols: {
    ma_dinh_danh:'T', ho_ten_hv:'T', nam_sinh:'T', ho_ten_ph:'T', sdt_ph:'T', lien_lac_hv:'T', nguon:'T',
    nguoi_gt_loai:'T', nguoi_gt_id:'T', sale_phu_trach:'T', trang_thai:'T', ngay_tao:'D', ghi_chu:'T' } },

  { sheet: 'LICHSU_CHAMSOC', table: 'lichsu_chamsoc', skipCols:['id'], cols: {
    ma_dinh_danh:'T', thoi_gian:'DT', nguoi_thuc_hien:'T', noi_dung:'T', giai_doan:'T' } },

  { sheet: 'GHIDANH', table: 'ghidanh', cols: {
    ghidanh_id:'T', ma_dinh_danh:'T', khoa_id:'T', hinh_thuc_dong:'T', gia_goc:'N', muc_giam:'N', ly_do_giam:'T',
    gia_cuoi:'N', so_buoi_dang_ky:'N', nguoi_gt_loai:'T', nguoi_gt_id:'T', hh_hinh_thuc:'T', hh_gia_tri:'N',
    ngay_ghidanh:'D', trang_thai:'T' } },

  { sheet: 'LOP', table: 'lop', cols: {
    lop_id:'T', ten_lop:'T', khoa_id:'T', gv_chinh_id:'T', hinh_thuc:'T', link_meet:'T', phong:'T',
    ngay_bat_dau:'D', lich_hoc:'T', so_buoi:'N', trang_thai:'T' } },

  { sheet: 'LOP_HOCVIEN', table: 'lop_hocvien', skipCols:['id'], cols: {
    lop_id:'T', ma_dinh_danh:'T', ghidanh_id:'T', gia_buoi_rieng:'N', ngay_them:'D', trang_thai:'T' } },

  { sheet: 'BUOIHOC', table: 'buoihoc', cols: {
    buoi_id:'T', lop_id:'T', ngay_hoc:'D', gio_hoc:'T', gv_thuc_day_id:'T', trang_thai:'T', ghi_chu:'T' } },

  { sheet: 'DIEMDANH', table: 'diemdanh', skipCols:['id'], cols: {
    buoi_id:'T', ma_dinh_danh:'T', trang_thai:'T', ghi_chu:'T' } },

  { sheet: 'HOCPHI', table: 'hocphi', cols: {
    hocphi_id:'T', ma_dinh_danh:'T', ghidanh_id:'T', ky:'K', so_buoi_tinh:'N', gia_buoi:'N', so_tien_phai_dong:'N',
    so_tien_da_dong:'N', ngay_dong:'D', nguoi_xac_nhan:'T', anh_ck:'T', trang_thai:'T', ngay_nhac_1:'D', ngay_nhac_2:'D' } },

  { sheet: 'CHI', table: 'chi', cols: {
    chi_id:'T', ngay:'D', loai:'T', noi_dung:'T', so_tien:'N', nguoi_chi:'T', ghi_chu:'T' } },

  { sheet: 'THU_KHAC', table: 'thu_khac', cols: {
    thu_id:'T', ngay:'D', loai:'T', noi_dung:'T', so_tien:'N', nguoi_thu:'T', ghi_chu:'T' } },

  { sheet: 'DONGIA_GV', table: 'dongia_gv', skipCols:['id'], cols: {
    gv_id:'T', lop_id:'T', don_gia_buoi:'N', hieu_luc_tu:'D', ghi_chu:'T' } },

  { sheet: 'LUONG_GV', table: 'luong_gv', cols: {
    luong_gv_id:'T', gv_id:'T', ky:'K', so_buoi_thuc_day:'N', tong_luong:'N', da_tra:'T', ngay_tra:'D', ghi_chu:'T' } },

  { sheet: 'LUONGCUNG_NHANSU', table: 'luongcung_nhansu', skipCols:['id'], cols: {
    staff_id:'T', luong_cung_thang:'N', hieu_luc_tu:'D', ghi_chu:'T' } },

  { sheet: 'LUONG_NHANSU', table: 'luong_nhansu', cols: {
    luong_nv_id:'T', staff_id:'T', ky:'K', luong_cung:'N', hoa_hong:'N', tong:'N', da_tra:'T', ngay_tra:'D', ghi_chu:'T' } },

  { sheet: 'HOAHONG', table: 'hoahong', cols: {
    hoahong_id:'T', nguoi_gt_loai:'T', nguoi_gt_id:'T', ma_dinh_danh:'T', ghidanh_id:'T', hinh_thuc:'T',
    gia_tri:'N', so_tien:'N', trang_thai:'T', ngay_phat_sinh:'D', ngay_chi:'D' } },
];

// Khóa chính để bỏ dòng rác (thiếu khóa → bỏ)
const PK = {
  nhansu:'staff_id', doitac:'doitac_id', khoahoc:'khoa_id', hocvien:'ma_dinh_danh',
  ghidanh:'ghidanh_id', lop:'lop_id', buoihoc:'buoi_id', hocphi:'hocphi_id',
  chi:'chi_id', thu_khac:'thu_id', luong_gv:'luong_gv_id', luong_nhansu:'luong_nv_id',
  hoahong:'hoahong_id', nhansu_vaitro:'staff_id', lop_hocvien:'lop_id',
  diemdanh:'buoi_id', lichsu_chamsoc:'ma_dinh_danh', dongia_gv:'gv_id', luongcung_nhansu:'staff_id',
};

function convert(val, type) {
  switch (type) {
    case 'N': return toInt(val);
    case 'D': return toDate(val);
    case 'K': return toKy(val);
    case 'DT': return toDateTime(val);
    default: return String(val ?? '').trim();
  }
}

/* ---------------- Chạy ---------------- */
function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`✗ Không thấy thư mục ${DATA_DIR}. Hãy đặt các file CSV vào đó.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const out = [];
  const summary = [];
  out.push('-- Sinh tự động bởi scripts/migrate.mjs — KHÔNG sửa tay');
  out.push('PRAGMA foreign_keys=OFF;');
  out.push('BEGIN TRANSACTION;');

  const maxId = { NS: 0, DT: 0, KH: 0, GD: 0, HP: 0 };

  for (const def of MAP) {
    const sheet = readSheet(def.sheet);
    if (!sheet) { summary.push([def.sheet, 'THIẾU CSV', 0]); continue; }

    const cols = Object.keys(def.cols);
    let n = 0;
    for (const r of sheet.rows) {
      const pkCol = PK[def.table];
      if (pkCol && !String(r[pkCol] ?? '').trim()) continue; // bỏ dòng trống/rác

      const vals = cols.map((c) => convert(r[c], def.cols[c]));
      out.push(`INSERT OR REPLACE INTO ${def.table}(${cols.join(', ')}) VALUES(${vals.map(sqlVal).join(', ')});`);
      n++;

      // lần theo ID lớn nhất cho counter
      const idv = String(r[pkCol] ?? '');
      let m;
      if ((m = idv.match(/^NS(\d+)$/))) maxId.NS = Math.max(maxId.NS, +m[1]);
      if ((m = idv.match(/^DT(\d+)$/))) maxId.DT = Math.max(maxId.DT, +m[1]);
      if ((m = idv.match(/^KH(\d+)$/))) maxId.KH = Math.max(maxId.KH, +m[1]);
      if ((m = idv.match(/^GD(\d+)$/))) maxId.GD = Math.max(maxId.GD, +m[1]);
      if ((m = idv.match(/^HP(\d+)$/))) maxId.HP = Math.max(maxId.HP, +m[1]);
    }
    summary.push([def.sheet, def.table, n]);
  }

  // counter: đặt ≥ ID lớn nhất để mã tiếp theo không trùng
  out.push('-- Cập nhật counter theo ID lớn nhất hiện có');
  const seq = { SEQ_NHANSU: maxId.NS, SEQ_DOITAC: maxId.DT, SEQ_KHOAHOC: maxId.KH, SEQ_GHIDANH: maxId.GD, SEQ_HOCPHI: maxId.HP };
  for (const [k, v] of Object.entries(seq)) {
    out.push(`INSERT INTO counter(key, value) VALUES('${k}', ${v}) ON CONFLICT(key) DO UPDATE SET value=MAX(counter.value, ${v});`);
  }

  out.push('COMMIT;');
  out.push('PRAGMA foreign_keys=ON;');
  fs.writeFileSync(OUT_FILE, out.join('\n'), 'utf8');

  // In báo cáo
  console.log('\n== KẾT QUẢ MIGRATE ==');
  for (const [sheet, table, n] of summary) {
    const status = table === 'THIẾU CSV' ? '⚠ thiếu CSV (bỏ qua)' : `→ ${table}: ${n} dòng`;
    console.log(`  ${sheet.padEnd(20)} ${status}`);
  }
  console.log('\n  counter:', seq);
  console.log(`\n✓ Đã ghi: ${OUT_FILE}`);
  console.log('\nNạp vào D1:');
  console.log('  npx wrangler d1 execute tcnf --local  --file=./scripts/out/seed.sql');
  console.log('  npx wrangler d1 execute tcnf --remote --file=./scripts/out/seed.sql\n');
}

main();
