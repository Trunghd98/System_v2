import { query } from "../db";

export const dsNhanSu = (db: D1Database) =>
  query(db, "SELECT * FROM nhansu   ORDER BY staff_id");
export const dsKhoaHoc = (db: D1Database) =>
  query(db, "SELECT * FROM khoahoc  ORDER BY khoa_id");
export const dsDoiTac = (db: D1Database) =>
  query(db, "SELECT * FROM doitac   ORDER BY doitac_id");
