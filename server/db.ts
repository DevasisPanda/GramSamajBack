import { drizzle } from "drizzle-orm/mysql2";
import { ensureDatabaseReady } from "./db-init";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (process.env.DATABASE_URL) {
    try {
      await ensureDatabaseReady(process.env.DATABASE_URL);
    } catch (e: any) {
      console.warn("[Database] ensureDatabaseReady error:", e?.message || e);
    }
    if (!_db) {
      try {
        _db = drizzle(process.env.DATABASE_URL);
      } catch (error) {
        console.warn("[Database] Failed to connect:", error);
        _db = null;
      }
    }
  }
  return _db;
}
