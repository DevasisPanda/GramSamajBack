import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { ensureDatabaseReady } from "./db-init";

let _pool: mysql.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getCleanDbConnectionConfig(dbUrl: string): any {
  try {
    const isCloud =
      dbUrl.includes("aivencloud.com") ||
      dbUrl.includes("planetscale") ||
      dbUrl.includes("tidb") ||
      dbUrl.includes("ssl-mode") ||
      dbUrl.includes("ssl=");

    if (isCloud || dbUrl.startsWith("mysql://") || dbUrl.startsWith("mysqls://")) {
      const url = new URL(dbUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || "3306"),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, "") || "defaultdb",
        ssl: {
          rejectUnauthorized: false,
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      };
    }
  } catch (parseErr) {
    console.warn("[Database] Connection URI parse notice:", parseErr);
  }

  return dbUrl;
}

export async function getDb() {
  if (process.env.DATABASE_URL) {
    try {
      await ensureDatabaseReady(process.env.DATABASE_URL);
    } catch (e: any) {
      console.warn("[Database] ensureDatabaseReady error:", e?.message || e);
    }
    if (!_db) {
      try {
        const config = getCleanDbConnectionConfig(process.env.DATABASE_URL);
        _pool = mysql.createPool(config);
        _db = drizzle(_pool);
      } catch (error) {
        console.warn("[Database] Failed to initialize connection pool:", error);
        _db = null;
      }
    }
  }
  return _db;
}
