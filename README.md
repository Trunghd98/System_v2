# Đặt file CSV xuất từ Google Sheets (Phase 1) vào đây

Với mỗi sheet: File → Download → Comma Separated Values (.csv)
Đổi tên file đúng tên sheet, ví dụ `NHANSU.csv`.

Cần các file (thiếu file nào script sẽ bỏ qua và báo ⚠):
NHANSU.csv, NHANSU_VAITRO.csv, DOITAC.csv, KHOAHOC.csv,
HOCVIEN.csv, LICHSU_CHAMSOC.csv, GHIDANH.csv,
LOP.csv, LOP_HOCVIEN.csv, BUOIHOC.csv, DIEMDANH.csv,
HOCPHI.csv, CHI.csv, THU_KHAC.csv,
DONGIA_GV.csv, LUONG_GV.csv, LUONGCUNG_NHANSU.csv, LUONG_NHANSU.csv,
HOAHONG.csv

KHÔNG cần: BANG_THEODOI (là bản xuất, không phải dữ liệu gốc), COUNTER (script tự tính).

Sau đó chạy:  node scripts/migrate.mjs
