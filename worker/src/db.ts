// Helper mỏng bọc D1. Toàn bộ truy cập dữ liệu đi qua đây / repo (tầng đổi kho lưu sau này).

export async function query<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...binds: unknown[]
): Promise<T[]> {
  const r = await db
    .prepare(sql)
    .bind(...binds)
    .all<T>();
  return r.results ?? [];
}

export async function one<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...binds: unknown[]
): Promise<T | null> {
  const r = await db
    .prepare(sql)
    .bind(...binds)
    .first<T>();
  return (r as T) ?? null;
}

export async function run(
  db: D1Database,
  sql: string,
  ...binds: unknown[]
): Promise<D1Result> {
  return db
    .prepare(sql)
    .bind(...binds)
    .run();
}

/** Sinh mã tự tăng từ bảng counter. */
export async function nextSeq(db: D1Database, key: string): Promise<number> {
  await run(db, "INSERT OR IGNORE INTO counter(key, value) VALUES(?, 0)", key);
  await run(db, "UPDATE counter SET value = value + 1 WHERE key = ?", key);
  const row = await one<{ value: number }>(
    db,
    "SELECT value FROM counter WHERE key = ?",
    key,
  );
  return row?.value ?? 0;
}

export function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

/** Lỗi có kèm HTTP status. */
export function loi(msg: string, status = 400) {
  return Object.assign(new Error(msg), { status });
}

/** Ép về số nguyên (bỏ dấu chấm/đ). */
export function toInt(v: unknown): number {
  const s = String(v ?? "").replace(/[^\d-]/g, "");
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

/** Hôm nay theo giờ VN, dạng yyyy-MM-dd. */
export function todayVN(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
