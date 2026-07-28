import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import type { Env } from "./env";
import { query, one } from "./db";
import { modulesOf } from "./schema";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export interface SessionUser {
  email: string;
  staff_id: string;
  ho_ten: string;
  vaiTro: string[];
  modules: string[];
}

function loi(msg: string, status: number) {
  return Object.assign(new Error(msg), { status });
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<string> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  const email = ((payload.email as string) || "").toLowerCase();
  if (!email || payload.email_verified === false)
    throw loi("Email Google chưa xác minh", 401);
  return email;
}

export async function taoPhien(
  env: Env,
  email: string,
): Promise<{ token: string; user: SessionUser }> {
  const ns = await one<{ staff_id: string; ho_ten: string }>(
    env.DB,
    "SELECT staff_id, ho_ten FROM nhansu WHERE lower(gmail) = ? AND trang_thai = 'đang_làm'",
    email,
  );
  if (!ns) throw loi("Email không có quyền truy cập: " + email, 403);

  const roles = await query<{ vai_tro: string }>(
    env.DB,
    "SELECT vai_tro FROM nhansu_vaitro WHERE staff_id = ?",
    ns.staff_id,
  );
  const vaiTro = roles.map((r) => r.vai_tro);
  const modules = modulesOf(vaiTro) as string[];
  const user: SessionUser = {
    email,
    staff_id: ns.staff_id,
    ho_ten: ns.ho_ten,
    vaiTro,
    modules,
  };

  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
  return { token, user };
}

export async function docPhien(
  env: Env,
  authHeader: string | undefined,
): Promise<SessionUser> {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "");
  if (!token) throw loi("Chưa đăng nhập", 401);
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      email: payload.email as string,
      staff_id: payload.staff_id as string,
      ho_ten: payload.ho_ten as string,
      vaiTro: (payload.vaiTro as string[]) || [],
      modules: (payload.modules as string[]) || [],
    };
  } catch {
    throw loi("Phiên hết hạn, đăng nhập lại", 401);
  }
}
