// Module & phân quyền — giữ nguyên logic Phase 1.

export const MODULES = [
  'tuyensinh', 'vanhanh', 'hocphi', 'luonggv', 'luongnv', 'hoahong', 'baocao', 'nhansu',
] as const;
export type Module = (typeof MODULES)[number];

const ALL_TRU_NHANSU = MODULES.filter((m) => m !== 'nhansu') as Module[];

export const PERMISSION: Record<string, Module[]> = {
  Admin: [...MODULES],
  QL_Sale: ['tuyensinh', 'vanhanh', 'hocphi', 'hoahong', 'luongnv', 'baocao'],
  QL_VanHanh: ALL_TRU_NHANSU,
  KeToan: ALL_TRU_NHANSU,
  GiaoVien: ['vanhanh', 'luonggv'],
};

export const VAITRO_HOPLE = ['Admin', 'QL_Sale', 'QL_VanHanh', 'GiaoVien', 'KeToan'];

/** Gộp module từ danh sách vai trò. */
export function modulesOf(vaiTro: string[]): Module[] {
  const set = new Set<Module>();
  for (const r of vaiTro) (PERMISSION[r] || []).forEach((m) => set.add(m));
  return [...set];
}

/** Người dùng đã đăng nhập (đọc từ JWT phiên). */
export interface AppUser {
  email: string;
  staff_id: string;
  ho_ten: string;
  vaiTro: string[];
}
