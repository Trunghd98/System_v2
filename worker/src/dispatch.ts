import type { Env } from "./env";
import type { SessionUser } from "./auth";
import * as danhmuc from "./repo/danhmuc";
import * as nhansu from "./repo/nhansu";
import * as tuyensinh from "./repo/tuyensinh";
import * as vanhanh from "./repo/vanhanh";
import * as ketoan from "./repo/ketoan";

type Handler = (env: Env, payload: any, user: SessionUser) => Promise<unknown>;

const MODULE_OF: Record<string, string> = {
  // Nhân sự
  dsNhanSu: "nhansu",
  themNhanSu: "nhansu",
  capNhatNhanSu: "nhansu",
  setLuongCung: "nhansu",
  setDonGia: "nhansu",
  // Tuyển sinh
  dsKhoaHoc: "tuyensinh",
  themKhoaHoc: "tuyensinh",
  capNhatKhoaHoc: "tuyensinh",
  dsHocVien: "tuyensinh",
  themHocVien: "tuyensinh",
  capNhatHocVien: "tuyensinh",
  dsChamSoc: "tuyensinh",
  themChamSoc: "tuyensinh",
  dsNguoiGioiThieu: "tuyensinh",
  dsGhiDanh: "tuyensinh",
  themGhiDanh: "tuyensinh",
  dsDoiTac: "tuyensinh",
  // Vận hành
  dsGiaoVien: "vanhanh",
  dsLop: "vanhanh",
  themLop: "vanhanh",
  capNhatLop: "vanhanh",
  dsGhiDanhChoLop: "vanhanh",
  dsHocVienLop: "vanhanh",
  themNhieuHocVienVaoLop: "vanhanh",
  xoaHocVienKhoiLop: "vanhanh",
  dsBuoiHoc: "vanhanh",
  themBuoiHoc: "vanhanh",
  taoBuoiHangLoat: "vanhanh",
  capNhatBuoiHoc: "vanhanh",
  dsDiemDanh: "vanhanh",
  luuDiemDanh: "vanhanh",
  // Kế toán
  sinhKhoanPhaiThu: "hocphi",
  dsCongNo: "hocphi",
  danhDauThu: "hocphi",
  thuGop: "hocphi",
};

const handlers: Record<string, Handler> = {
  // Nhân sự
  dsNhanSu: (env) => nhansu.dsNhanSu(env.DB),
  themNhanSu: (env, p) => nhansu.themNhanSu(env.DB, p),
  capNhatNhanSu: (env, p) => nhansu.capNhatNhanSu(env.DB, p),
  setLuongCung: (env, p) => nhansu.setLuongCung(env.DB, p),
  setDonGia: (env, p) => nhansu.setDonGia(env.DB, p),
  // Tuyển sinh — khóa học
  dsKhoaHoc: (env) => tuyensinh.dsKhoaHoc(env.DB),
  themKhoaHoc: (env, p) => tuyensinh.themKhoaHoc(env.DB, p),
  capNhatKhoaHoc: (env, p) => tuyensinh.capNhatKhoaHoc(env.DB, p),
  // Tuyển sinh — học viên
  dsHocVien: (env) => tuyensinh.dsHocVien(env.DB),
  themHocVien: (env, p) => tuyensinh.themHocVien(env.DB, p),
  capNhatHocVien: (env, p) => tuyensinh.capNhatHocVien(env.DB, p),
  // Tuyển sinh — chăm sóc
  dsChamSoc: (env, p) => tuyensinh.dsChamSoc(env.DB, p),
  themChamSoc: (env, p, u) => tuyensinh.themChamSoc(env.DB, p, u),
  // Tuyển sinh — ghi danh
  dsNguoiGioiThieu: (env) => tuyensinh.dsNguoiGioiThieu(env.DB),
  dsGhiDanh: (env) => tuyensinh.dsGhiDanh(env.DB),
  themGhiDanh: (env, p) => tuyensinh.themGhiDanh(env.DB, p),
  // Vận hành — lớp
  dsGiaoVien: (env) => vanhanh.dsGiaoVien(env.DB),
  dsLop: (env) => vanhanh.dsLop(env.DB),
  themLop: (env, p) => vanhanh.themLop(env.DB, p),
  capNhatLop: (env, p) => vanhanh.capNhatLop(env.DB, p),
  // Vận hành — xếp học viên
  dsGhiDanhChoLop: (env, p) => vanhanh.dsGhiDanhChoLop(env.DB, p),
  dsHocVienLop: (env, p) => vanhanh.dsHocVienLop(env.DB, p),
  themNhieuHocVienVaoLop: (env, p) => vanhanh.themNhieuHocVienVaoLop(env.DB, p),
  xoaHocVienKhoiLop: (env, p) => vanhanh.xoaHocVienKhoiLop(env.DB, p),
  // Vận hành — buổi học
  dsBuoiHoc: (env, p) => vanhanh.dsBuoiHoc(env.DB, p),
  themBuoiHoc: (env, p) => vanhanh.themBuoiHoc(env.DB, p),
  taoBuoiHangLoat: (env, p) => vanhanh.taoBuoiHangLoat(env.DB, p),
  capNhatBuoiHoc: (env, p) => vanhanh.capNhatBuoiHoc(env.DB, p),
  // Vận hành — điểm danh
  dsDiemDanh: (env, p) => vanhanh.dsDiemDanh(env.DB, p),
  luuDiemDanh: (env, p) => vanhanh.luuDiemDanh(env.DB, p),
  // Kế toán — công nợ
  sinhKhoanPhaiThu: (env, p) => ketoan.sinhKhoanPhaiThu(env.DB, p),
  dsCongNo: (env, p) => ketoan.dsCongNo(env.DB, p),
  danhDauThu: (env, p) => ketoan.danhDauThu(env.DB, p),
  thuGop: (env, p) => ketoan.thuGop(env.DB, p),
  // Danh mục
  dsDoiTac: (env) => danhmuc.dsDoiTac(env.DB),
};

export async function dispatch(
  action: string,
  env: Env,
  payload: any,
  user: SessionUser,
) {
  const h = handlers[action];
  if (!h)
    throw Object.assign(new Error("Action không hợp lệ: " + action), {
      status: 400,
    });
  const mod = MODULE_OF[action];
  if (mod && !user.modules.includes(mod))
    throw Object.assign(new Error("Không có quyền dùng: " + action), {
      status: 403,
    });
  return h(env, payload, user);
}
