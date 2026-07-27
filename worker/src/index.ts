import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  ALLOWED_ORIGIN: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin, c) => {
    const allow = (c.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim());
    return allow.includes(origin) ? origin : (allow[0] || '');
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/health', (c) =>
  c.json({ ok: true, data: { status: 'up', ts: new Date().toISOString() } }));

app.post('/auth/google', (c) =>
  c.json({ ok: false, error: 'Chưa cài đặt: /auth/google (GĐ5)' }, 501));

app.get('/me', (c) =>
  c.json({ ok: false, error: 'Chưa cài đặt: /me (GĐ5)' }, 501));

app.post('/api', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { action?: string };
  return c.json({ ok: false, error: `Chưa cài đặt action: ${body.action ?? '(trống)'}` }, 501);
});

app.notFound((c) => c.json({ ok: false, error: 'Not found' }, 404));

export default app;
