import type { Env } from "./env";
import type { SessionUser } from "./auth";
import * as danhmuc from "./repo/danhmuc";

type Handler = (
  env: Env,
  payload: Record<string, unknown>,
  user: SessionUser,
) => Promise<unknown>;

const MODULE_OF: Record<string, string> = {
  dsNhanSu: "nhansu",
  dsKhoaHoc: "tuyensinh",
  dsDoiTac: "tuyensinh",
};

const handlers: Record<string, Handler> = {
  dsNhanSu: (env) => danhmuc.dsNhanSu(env.DB),
  dsKhoaHoc: (env) => danhmuc.dsKhoaHoc(env.DB),
  dsDoiTac: (env) => danhmuc.dsDoiTac(env.DB),
};

export async function dispatch(
  action: string,
  env: Env,
  payload: Record<string, unknown>,
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
