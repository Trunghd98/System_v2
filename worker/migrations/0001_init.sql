-- ============================================================
-- TCNF Phase 2 — Schema D1 (SQLite)
-- Cột giữ như Phase 1. Ngày lưu TEXT 'yyyy-MM-dd'; ky TEXT 'yyyy-MM'; tiền/số buổi INTEGER.
-- Cờ có/không, trạng thái lưu TEXT (giữ nguyên giá trị tiếng Việt như Phase 1).
-- ============================================================

-- ---------- DANH MỤC ----------
CREATE TABLE IF NOT EXISTS nhansu (
  staff_id       TEXT PRIMARY KEY,
  ho_ten         TEXT,
  gmail          TEXT,
  co_luong_cung  TEXT,
  co_day         TEXT,
  trang_thai     TEXT DEFAULT 'đang_làm',
  ngay_tao       TEXT,
  la_doi_tac_ln  TEXT DEFAULT 'không'
);
CREATE INDEX IF NOT EXISTS idx_nhansu_gmail ON nhansu(gmail);

CREATE TABLE IF NOT EXISTS nhansu_vaitro (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id  TEXT NOT NULL,
  vai_tro   TEXT NOT NULL,
  ghi_chu   TEXT
);
CREATE INDEX IF NOT EXISTS idx_nsvt_staff ON nhansu_vaitro(staff_id);

CREATE TABLE IF NOT EXISTS doitac (
  doitac_id    TEXT PRIMARY KEY,
  ten_doi_tac  TEXT,
  lien_he      TEXT,
  ghi_chu      TEXT,
  trang_thai   TEXT,
  ngay_tao     TEXT
);

CREATE TABLE IF NOT EXISTS khoahoc (
  khoa_id            TEXT PRIMARY KEY,
  ten_khoa           TEXT,
  ngon_ngu           TEXT,
  loai               TEXT,
  so_buoi_mac_dinh   INTEGER,
  gia_goc_mac_dinh   INTEGER,
  trang_thai         TEXT DEFAULT 'đang_mở'
);

CREATE TABLE IF NOT EXISTS counter (
  key     TEXT PRIMARY KEY,
  value   INTEGER DEFAULT 0,
  ghi_chu TEXT
);

-- ---------- TUYỂN SINH ----------
CREATE TABLE IF NOT EXISTS hocvien (
  ma_dinh_danh   TEXT PRIMARY KEY,
  ho_ten_hv      TEXT,
  nam_sinh       TEXT,
  ho_ten_ph      TEXT,
  sdt_ph         TEXT,
  lien_lac_hv    TEXT,
  nguon          TEXT,
  nguoi_gt_loai  TEXT,
  nguoi_gt_id    TEXT,
  sale_phu_trach TEXT,
  trang_thai     TEXT,
  ngay_tao       TEXT,
  ghi_chu        TEXT
);

CREATE TABLE IF NOT EXISTS lichsu_chamsoc (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_dinh_danh    TEXT NOT NULL,
  thoi_gian       TEXT,
  nguoi_thuc_hien TEXT,
  noi_dung        TEXT,
  giai_doan       TEXT
);
CREATE INDEX IF NOT EXISTS idx_chamsoc_ma ON lichsu_chamsoc(ma_dinh_danh);

CREATE TABLE IF NOT EXISTS ghidanh (
  ghidanh_id       TEXT PRIMARY KEY,
  ma_dinh_danh     TEXT NOT NULL,
  khoa_id          TEXT,
  hinh_thuc_dong   TEXT,            -- THÁNG | TRỌN_KHÓA
  gia_goc          INTEGER,
  muc_giam         INTEGER,
  ly_do_giam       TEXT,
  gia_cuoi         INTEGER,
  so_buoi_dang_ky  INTEGER,
  nguoi_gt_loai    TEXT,            -- KHÔNG | ĐỐI_TÁC | NHÂN_VIÊN
  nguoi_gt_id      TEXT,
  hh_hinh_thuc     TEXT,            -- PHẦN_TRĂM | CỐ_ĐỊNH | ''
  hh_gia_tri       INTEGER,
  ngay_ghidanh     TEXT,
  trang_thai       TEXT
);
CREATE INDEX IF NOT EXISTS idx_ghidanh_ma ON ghidanh(ma_dinh_danh);

-- ---------- VẬN HÀNH ----------
CREATE TABLE IF NOT EXISTS lop (
  lop_id       TEXT PRIMARY KEY,
  ten_lop      TEXT,
  khoa_id      TEXT,
  gv_chinh_id  TEXT,
  hinh_thuc    TEXT,               -- online | offline
  link_meet    TEXT,
  phong        TEXT,
  ngay_bat_dau TEXT,
  lich_hoc     TEXT,
  so_buoi      INTEGER,
  trang_thai   TEXT DEFAULT 'mở'   -- mở | đang_chạy | kết_thúc
);

CREATE TABLE IF NOT EXISTS lop_hocvien (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lop_id          TEXT NOT NULL,
  ma_dinh_danh    TEXT NOT NULL,
  ghidanh_id      TEXT,
  gia_buoi_rieng  INTEGER,
  ngay_them       TEXT,
  trang_thai      TEXT DEFAULT 'đang_học'  -- đang_học | đã_rời
);
CREATE INDEX IF NOT EXISTS idx_lhv_lop ON lop_hocvien(lop_id);
CREATE INDEX IF NOT EXISTS idx_lhv_ma  ON lop_hocvien(ma_dinh_danh);

CREATE TABLE IF NOT EXISTS buoihoc (
  buoi_id         TEXT PRIMARY KEY,
  lop_id          TEXT NOT NULL,
  ngay_hoc        TEXT,            -- yyyy-MM-dd
  gio_hoc         TEXT,
  gv_thuc_day_id  TEXT,
  trang_thai      TEXT DEFAULT 'dự_kiến', -- dự_kiến | đã_dạy | cả_lớp_nghỉ | dồn_buổi
  ghi_chu         TEXT
);
CREATE INDEX IF NOT EXISTS idx_buoi_lop_ngay ON buoihoc(lop_id, ngay_hoc);

CREATE TABLE IF NOT EXISTS diemdanh (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  buoi_id       TEXT NOT NULL,
  ma_dinh_danh  TEXT NOT NULL,
  trang_thai    TEXT,             -- có_mặt | nghỉ_lẻ | cả_lớp_nghỉ
  ghi_chu       TEXT
);
CREATE INDEX IF NOT EXISTS idx_diemdanh_buoi ON diemdanh(buoi_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_diemdanh ON diemdanh(buoi_id, ma_dinh_danh);

-- ---------- KẾ TOÁN ----------
CREATE TABLE IF NOT EXISTS hocphi (
  hocphi_id          TEXT PRIMARY KEY,
  ma_dinh_danh       TEXT,
  ghidanh_id         TEXT,
  ky                 TEXT,          -- yyyy-MM
  so_buoi_tinh       INTEGER,
  gia_buoi           INTEGER,
  so_tien_phai_dong  INTEGER,
  so_tien_da_dong    INTEGER DEFAULT 0,
  ngay_dong          TEXT,
  nguoi_xac_nhan     TEXT,
  anh_ck             TEXT,
  trang_thai         TEXT DEFAULT 'chưa_đóng', -- chưa_đóng | đã_đóng | đóng_trễ
  ngay_nhac_1        TEXT,
  ngay_nhac_2        TEXT
);
CREATE INDEX IF NOT EXISTS idx_hocphi_ky ON hocphi(ky);
CREATE INDEX IF NOT EXISTS idx_hocphi_ghidanh_ky ON hocphi(ghidanh_id, ky);

CREATE TABLE IF NOT EXISTS chi (
  chi_id    TEXT PRIMARY KEY,
  ngay      TEXT,
  loai      TEXT,
  noi_dung  TEXT,
  so_tien   INTEGER,
  nguoi_chi TEXT,
  ghi_chu   TEXT
);

CREATE TABLE IF NOT EXISTS thu_khac (
  thu_id    TEXT PRIMARY KEY,
  ngay      TEXT,
  loai      TEXT,
  noi_dung  TEXT,
  so_tien   INTEGER,
  nguoi_thu TEXT,
  ghi_chu   TEXT
);

-- ---------- LƯƠNG ----------
CREATE TABLE IF NOT EXISTS dongia_gv (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  gv_id        TEXT NOT NULL,
  lop_id       TEXT,
  don_gia_buoi INTEGER,
  hieu_luc_tu  TEXT,
  ghi_chu      TEXT
);

CREATE TABLE IF NOT EXISTS luong_gv (
  luong_gv_id       TEXT PRIMARY KEY,
  gv_id             TEXT NOT NULL,
  ky                TEXT,          -- yyyy-MM
  so_buoi_thuc_day  INTEGER,
  tong_luong        INTEGER,
  da_tra            TEXT DEFAULT 'chưa', -- rồi | chưa
  ngay_tra          TEXT,
  ghi_chu           TEXT
);
CREATE INDEX IF NOT EXISTS idx_luonggv_gv_ky ON luong_gv(gv_id, ky);

CREATE TABLE IF NOT EXISTS luongcung_nhansu (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id         TEXT NOT NULL,
  luong_cung_thang INTEGER,
  hieu_luc_tu      TEXT,
  ghi_chu          TEXT
);

CREATE TABLE IF NOT EXISTS luong_nhansu (
  luong_nv_id  TEXT PRIMARY KEY,
  staff_id     TEXT NOT NULL,
  ky           TEXT,
  luong_cung   INTEGER,
  hoa_hong     INTEGER,
  tong         INTEGER,
  da_tra       TEXT DEFAULT 'chưa',
  ngay_tra     TEXT,
  ghi_chu      TEXT
);
CREATE INDEX IF NOT EXISTS idx_luongnv_staff_ky ON luong_nhansu(staff_id, ky);

-- ---------- HOA HỒNG ----------
CREATE TABLE IF NOT EXISTS hoahong (
  hoahong_id     TEXT PRIMARY KEY,
  nguoi_gt_loai  TEXT,             -- ĐỐI_TÁC | NHÂN_VIÊN
  nguoi_gt_id    TEXT,
  ma_dinh_danh   TEXT,
  ghidanh_id     TEXT,
  hinh_thuc      TEXT,
  gia_tri        INTEGER,
  so_tien        INTEGER,
  trang_thai     TEXT DEFAULT 'chờ_chi', -- chờ_chi | đã_chi
  ngay_phat_sinh TEXT,
  ngay_chi       TEXT
);
CREATE INDEX IF NOT EXISTS idx_hoahong_ghidanh ON hoahong(ghidanh_id);

-- ---------- SEED COUNTER (mã tự tăng) ----------
INSERT OR IGNORE INTO counter(key, value, ghi_chu) VALUES
  ('SEQ_NHANSU',   0, 'staff_id NS+3'),
  ('SEQ_DOITAC',   0, 'doitac_id DT+3'),
  ('SEQ_KHOAHOC',  0, 'khoa_id KH+3'),
  ('SEQ_GHIDANH',  0, 'ghidanh_id GD+5'),
  ('SEQ_HOCPHI',   0, 'hocphi_id HP+6');
-- Mã ma_dinh_danh (U+yyyyMM+hex) và lop_id (CL+yyyy+hex) dùng key động HV_<yyyymm>, LOP_<yyyy>.
