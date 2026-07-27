import type { Env } from './env';
import * as danhmuc from './repo/danhmuc';

type Handler = (env: Env, payload: Record<string, unknown>) => Promise<unknown>;

const handlers: Record<string, Handler> = {
  dsNhanSu:  (env) => danhmuc.dsNhanSu(env.DB),
  dsKhoaHoc: (env) => danhmuc.dsKhoaHoc(env.DB),
  dsDoiTac:  (env) => danhmuc.dsDoiTac(env.DB),
};

export async function dispatch(action: string, env: Env, payload: Record<string, unknown>) {
  const h = handlers[action];
  if (!h) {
    const err = new Error('Action không hợp lệ: ' + action) as Error & { status?: number };
    err.status = 400;
    throw err;
  }
  return h(env, payload);
}
