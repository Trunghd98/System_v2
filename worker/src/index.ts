import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { dispatch } from './dispatch';

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
  const body = (await c.req.json().catch(() => ({}))) as { action?: string; payload?: Record<string, unknown> };
  if (!body.action) return c.json({ ok: false, error: 'Thiếu action' }, 400);
  try {
    const data = await dispatch(body.action, c.env, body.payload ?? {});
    return c.json({ ok: true, data });
  } catch (e) {
    const err = e as Error & { status?: number };
    return c.json({ ok: false, error: err.message ?? 'Lỗi' }, (err.status ?? 500) as 500);
  }
});

app.notFound((c) => c.json({ ok: false, error: 'Not found' }, 404));

export default app;
