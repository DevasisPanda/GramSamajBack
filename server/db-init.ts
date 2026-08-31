import mysql from "mysql2/promise";
import { hashPassword } from "./auth";

export const TABLE_COLUMNS: Record<string, Array<{ name: string; type: string }>> = {
  users: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "openId", type: "varchar(64) UNIQUE" },
    { name: "name", type: "text" },
    { name: "email", type: "varchar(320) UNIQUE" },
    { name: "passwordHash", type: "text" },
    { name: "phone", type: "varchar(20)" },
    { name: "loginMethod", type: "varchar(64)" },
    { name: "role", type: "enum('user','admin','staff','volunteer') NOT NULL DEFAULT 'user'" },
    { name: "isSystemAdmin", type: "boolean NOT NULL DEFAULT false" },
    { name: "status", type: "enum('active','inactive','blocked','pending') NOT NULL DEFAULT 'pending'" },
    { name: "membershipType", type: "varchar(50)" },
    { name: "profileImage", type: "text" },
    { name: "bio", type: "text" },
    { name: "fatherName", type: "varchar(255)" },
    { name: "dob", type: "date" },
    { name: "aadharNumber", type: "varchar(255)" },
    { name: "gender", type: "enum('male','female','other')" },
    { name: "maritalStatus", type: "enum('single','married','divorced','widowed')" },
    { name: "category", type: "enum('General','OBC','SC','ST','Other')" },
    { name: "bloodGroup", type: "varchar(10)" },
    { name: "occupation", type: "varchar(255)" },
    { name: "address", type: "text" },
    { name: "pinCode", type: "varchar(20)" },
    { name: "state", type: "varchar(100)" },
    { name: "city", type: "varchar(100)" },
    { name: "designation", type: "varchar(255)" },
    { name: "resetToken", type: "varchar(255)" },
    { name: "resetTokenExpiry", type: "timestamp NULL" },
    { name: "tokenGeneration", type: "int NOT NULL DEFAULT 0" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "updatedAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
    { name: "lastSignedIn", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" }
  ],
  members: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "userId", type: "int NOT NULL" },
    { name: "membershipNumber", type: "varchar(50) NOT NULL UNIQUE" },
    { name: "membershipType", type: "enum('regular','lifetime') NOT NULL DEFAULT 'regular'" },
    { name: "status", type: "enum('pending','active','inactive','expired','rejected') NOT NULL DEFAULT 'pending'" },
    { name: "joinDate", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "renewalDate", type: "timestamp NULL" },
    { name: "expiryDate", type: "timestamp NULL" },
    { name: "referralCode", type: "varchar(50) UNIQUE" },
    { name: "referredBy", type: "int" },
    { name: "approvedBy", type: "int" },
    { name: "approvalDate", type: "timestamp NULL" },
    { name: "notes", type: "text" },
    { name: "paymentStatus", type: "enum('unpaid','paid','exempted') NOT NULL DEFAULT 'unpaid'" },
    { name: "paymentTxnId", type: "varchar(255)" },
    { name: "amountPaid", type: "varchar(50)" },
    { name: "paymentType", type: "enum('lifetime_one_time','yearly_subscription','admin_exempted')" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "updatedAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
  ],
  donations: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "userId", type: "int" },
    { name: "donorName", type: "varchar(255) NOT NULL" },
    { name: "donorEmail", type: "varchar(320) NOT NULL" },
    { name: "donorPhone", type: "varchar(20)" },
    { name: "donorPan", type: "varchar(20)" },
    { name: "donorAddress", type: "text" },
    { name: "amount", type: "decimal(12,2) NOT NULL" },
    { name: "currency", type: "varchar(10) NOT NULL DEFAULT 'INR'" },
    { name: "purpose", type: "varchar(255)" },
    { name: "campaignId", type: "int" },
    { name: "paymentMethod", type: "varchar(50)" },
    { name: "paymentStatus", type: "enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending'" },
    { name: "razorpayOrderId", type: "varchar(255)" },
    { name: "razorpayPaymentId", type: "varchar(255)" },
    { name: "receiptNumber", type: "varchar(50) UNIQUE" },
    { name: "receiptUrl", type: "text" },
    { name: "isAnonymous", type: "boolean NOT NULL DEFAULT false" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "updatedAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
  ],
  campaigns: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "title", type: "varchar(255) NOT NULL" },
    { name: "description", type: "longtext" },
    { name: "targetAmount", type: "decimal(12,2) NOT NULL" },
    { name: "raisedAmount", type: "decimal(12,2) NOT NULL DEFAULT '0.00'" },
    { name: "startDate", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "endDate", type: "timestamp NULL" },
    { name: "status", type: "enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft'" },
    { name: "imageUrl", type: "text" },
    { name: "category", type: "varchar(100)" },
    { name: "beneficiaryDetails", type: "text" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "updatedAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
  ],
  events: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "title", type: "varchar(255) NOT NULL" },
    { name: "description", type: "longtext" },
    { name: "eventDate", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "location", type: "varchar(255)" },
    { name: "category", type: "varchar(100)" },
    { name: "status", type: "enum('upcoming','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming'" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "updatedAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
  ],
  gallery: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "title", type: "varchar(255) NOT NULL" },
    { name: "description", type: "text" },
    { name: "imageUrl", type: "text" },
    { name: "redirectUrl", type: "text" },
    { name: "mediaType", type: "enum('image','video') NOT NULL DEFAULT 'image'" },
    { name: "category", type: "varchar(100)" },
    { name: "uploadedBy", type: "int" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" }
  ],
  enquiries: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "name", type: "varchar(255) NOT NULL" },
    { name: "email", type: "varchar(320) NOT NULL" },
    { name: "phone", type: "varchar(20)" },
    { name: "subject", type: "varchar(255)" },
    { name: "message", type: "longtext NOT NULL" },
    { name: "status", type: "enum('new','in_progress','resolved','closed') NOT NULL DEFAULT 'new'" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" }
  ],
  beneficiaries: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "name", type: "varchar(255) NOT NULL" },
    { name: "phone", type: "varchar(20)" },
    { name: "address", type: "text" },
    { name: "category", type: "varchar(100)" },
    { name: "status", type: "varchar(50) DEFAULT 'active'" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" }
  ],
  expenses: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "title", type: "varchar(255) NOT NULL" },
    { name: "amount", type: "decimal(12,2) NOT NULL" },
    { name: "category", type: "varchar(100) NOT NULL" },
    { name: "expenseDate", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "description", type: "text" },
    { name: "receiptUrl", type: "text" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" }
  ],
  news: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "title", type: "varchar(255) NOT NULL" },
    { name: "content", type: "longtext NOT NULL" },
    { name: "publishedAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" },
    { name: "category", type: "varchar(100)" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" }
  ],
  auditLogs: [
    { name: "id", type: "int AUTO_INCREMENT PRIMARY KEY" },
    { name: "userId", type: "int" },
    { name: "action", type: "varchar(255) NOT NULL" },
    { name: "details", type: "text" },
    { name: "ipAddress", type: "varchar(45)" },
    { name: "createdAt", type: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP" }
  ]
};

let initPromise: Promise<void> | null = null;

function getCleanDbConnectionConfig(dbUrl: string): any {
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
      };
    }
  } catch (parseErr) {
    console.warn("[Database] Connection URI parse notice:", parseErr);
  }

  return dbUrl;
}

export async function ensureDatabaseReady(databaseUrl?: string): Promise<void> {
  const dbUrl = databaseUrl || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[Database] No DATABASE_URL found.");
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      let connection: mysql.Connection | null = null;
      try {
        console.log("[Database] Connecting to verify and auto-migrate all tables and columns...");
        connection = await mysql.createConnection(getCleanDbConnectionConfig(dbUrl));

        for (const [tableName, columns] of Object.entries(TABLE_COLUMNS)) {
          try {
            // Check if table exists
            const [tables]: any = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
            if (tables.length === 0) {
              // Build create table query
              const colDefs = columns.map(c => `\`${c.name}\` ${c.type}`).join(", ");
              await connection.query(`CREATE TABLE \`${tableName}\` (${colDefs})`);
              console.log(`[Database] Created table: ${tableName}`);
            } else {
              // Table exists: verify all columns exist, add missing columns
              const [existingCols]: any = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
              const existingNames = new Set(existingCols.map((r: any) => r.Field.toLowerCase()));

              for (const col of columns) {
                if (!existingNames.has(col.name.toLowerCase())) {
                  try {
                    // Strip PRIMARY KEY / AUTO_INCREMENT for added columns
                    const cleanType = col.type.replace(/AUTO_INCREMENT/gi, "").replace(/PRIMARY KEY/gi, "").trim();
                    await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${cleanType}`);
                    console.log(`[Database] Added missing column: ${tableName}.${col.name}`);
                  } catch (alterErr: any) {
                    console.warn(`[Database] Notice adding ${tableName}.${col.name}:`, alterErr?.message);
                  }
                }
              }
            }
          } catch (tblErr: any) {
            console.error(`[Database] Error processing table ${tableName}:`, tblErr?.message);
          }
        }
        console.log("[Database] ✅ All database tables and columns are fully synchronized.");

        // Automatically seed/synchronize admin user
        const adminEmail = (process.env.ADMIN_EMAIL || "admin@airdup.com").trim().toLowerCase();
        const adminPassword = process.env.ADMIN_SEED_PASSWORD || "admin123";

        const [rows]: any = await connection.query("SELECT id, email FROM users WHERE email = ? LIMIT 1", [adminEmail]);
        const passwordHash = await hashPassword(adminPassword);

        if (rows.length === 0) {
          console.log(`[AutoSeed] Seeding default System Admin: ${adminEmail}`);
          await connection.query(
            "INSERT INTO users (name, email, passwordHash, role, isSystemAdmin, status, membershipType, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, 'admin', 1, 'active', 'regular', NOW(), NOW(), NOW())",
            ["System Admin", adminEmail, passwordHash]
          );
          console.log(`[AutoSeed] ✅ Admin user successfully configured: ${adminEmail}`);
        } else {
          // Keep credentials synchronized
          await connection.query(
            "UPDATE users SET passwordHash = ?, role = 'admin', isSystemAdmin = 1, status = 'active' WHERE email = ?",
            [passwordHash, adminEmail]
          );
          console.log(`[AutoSeed] ✅ Admin credentials synced: ${adminEmail}`);
        }
      } catch (err: any) {
        console.error("[Database] Initialization error:", err?.message || err);
      } finally {
        if (connection) await connection.end();
      }
    })();
  }

  return initPromise;
}
