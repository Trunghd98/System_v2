import type { Env } from "./env";
import type { SessionUser } from "./auth";
import * as danhmuc from "./repo/danhmuc";
import * as nhansu from "./repo/nhansu";

type Handler = (env: Env, payload: any, user: SessionUser) => Promise<unknown>;

const MODULE_OF: Record<string, string> = {
  dsNhanSu: "nhansu",
  themNhanSu: "nhansu",
  capNhatNhanSu: "nhansu",
  setLuongCung: "nhansu",
  setDonGia: "nhansu",
  dsKhoaHoc: "tuyensinh",
  dsDoiTac: "tuyensinh",
};

const handlers: Record<string, Handler> = {
  // Nhân sự
  dsNhanSu: (env) => nhansu.dsNhanSu(env.DB),
  themNhanSu: (env, p) => nhansu.themNhanSu(env.DB, p),
  capNhatNhanSu: (env, p) => nhansu.capNhatNhanSu(env.DB, p),
  setLuongCung: (env, p) => nhansu.setLuongCung(env.DB, p),
  setDonGia: (env, p) => nhansu.setDonGia(env.DB, p),
  // Danh mục
  dsKhoaHoc: (env) => danhmuc.dsKhoaHoc(env.DB),
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
