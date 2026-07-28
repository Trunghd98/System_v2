import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { dispatch } from "./dispatch";
import { verifyGoogleIdToken, taoPhien, docPhien } from "./auth";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allow = (c.env.ALLOWED_ORIGIN || "")
        .split(",")
        .map((s) => s.trim());
      return allow.includes(origin) ? origin : allow[0] || "";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

const httpLoi = (c: any, e: unknown, mac = 500) => {
  const err = e as Error & { status?: number };
  return c.json({ ok: false, error: err.message ?? "Lỗi" }, err.status ?? mac);
};

app.get("/health", (c) =>
  c.json({ ok: true, data: { status: "up", ts: new Date().toISOString() } }),
);

app.post("/auth/google", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { idToken?: string };
  if (!body.idToken) return c.json({ ok: false, error: "Thiếu idToken" }, 400);
  try {
    const email = await verifyGoogleIdToken(
      body.idToken,
      c.env.GOOGLE_OAUTH_CLIENT_ID,
    );
    const data = await taoPhien(c.env, email);
    return c.json({ ok: true, data });
  } catch (e) {
    return httpLoi(c, e, 401);
  }
});

app.get("/me", async (c) => {
  try {
    const user = await docPhien(c.env, c.req.header("Authorization"));
    return c.json({ ok: true, data: user });
  } catch (e) {
    return httpLoi(c, e, 401);
  }
});

app.post("/api", async (c) => {
  let user;
  try {
    user = await docPhien(c.env, c.req.header("Authorization"));
  } catch (e) {
    return httpLoi(c, e, 401);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    action?: string;
    payload?: Record<string, unknown>;
  };
  if (!body.action) return c.json({ ok: false, error: "Thiếu action" }, 400);
  try {
    const data = await dispatch(body.action, c.env, body.payload ?? {}, user);
    return c.json({ ok: true, data });
  } catch (e) {
    return httpLoi(c, e, 500);
  }
});

app.notFound((c) => c.json({ ok: false, error: "Not found" }, 404));

export default app;
