// Danh mục module cho menu + điều hướng. id khớp với 'module' phía backend (phân quyền).
export interface ModuleDef {
  id: string;
  label: string;
  path: string;
}

export const MODULES: ModuleDef[] = [
  { id: "baocao", label: "Tổng quan", path: "/tong-quan" },
  { id: "tuyensinh", label: "Tuyển sinh", path: "/tuyen-sinh" },
  { id: "vanhanh", label: "Vận hành", path: "/van-hanh" },
  { id: "hocphi", label: "Học phí", path: "/hoc-phi" },
  { id: "luonggv", label: "Lương giáo viên", path: "/luong-gv" },
  { id: "luongnv", label: "Lương nhân viên", path: "/luong-nv" },
  { id: "hoahong", label: "Hoa hồng", path: "/hoa-hong" },
  { id: "nhansu", label: "Nhân sự", path: "/nhan-su" },
];
