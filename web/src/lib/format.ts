export function dinhDangTien(n: any): string {
  return (Number(n) || 0).toLocaleString("vi-VN");
}
export function docSoTien(s: any): number {
  const n = parseInt(String(s ?? "").replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}
