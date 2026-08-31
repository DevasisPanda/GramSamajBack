import mysql from "mysql2/promise";
import { hashPassword } from "./auth";

export const TABLE_DEFINITIONS = [
  `CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`openId\` varchar(64) UNIQUE,
    \`name\` text,
    \`email\` varchar(320) UNIQUE,
    \`passwordHash\` text,
    \`phone\` varchar(20),
    \`loginMethod\` varchar(64),
    \`role\` enum('user','admin','staff','volunteer') NOT NULL DEFAULT 'user',
    \`isSystemAdmin\` boolean NOT NULL DEFAULT false,
    \`status\` enum('active','inactive','blocked','pending') NOT NULL DEFAULT 'pending',
    \`membershipType\` varchar(50),
    \`profileImage\` text,
    \`bio\` text,
    \`fatherName\` varchar(255),
    \`dob\` date,
    \`aadharNumber\` varchar(255),
    \`gender\` enum('male','female','other'),
    \`maritalStatus\` enum('single','married','divorced','widowed'),
    \`category\` enum('General','OBC','SC','ST','Other'),
    \`bloodGroup\` varchar(10),
    \`occupation\` varchar(255),
    \`address\` text,
    \`pinCode\` varchar(20),
    \`state\` varchar(100),
    \`city\` varchar(100),
    \`designation\` varchar(255),
    \`resetToken\` varchar(255),
    \`resetTokenExpiry\` timestamp,
    \`tokenGeneration\` int NOT NULL DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`lastSignedIn\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`members\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`membershipNumber\` varchar(50) NOT NULL UNIQUE,
    \`membershipType\` enum('regular','lifetime') NOT NULL DEFAULT 'regular',
    \`status\` enum('pending','active','inactive','expired','rejected') NOT NULL DEFAULT 'pending',
    \`joinDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`renewalDate\` timestamp,
    \`expiryDate\` timestamp,
    \`referralCode\` varchar(50) UNIQUE,
    \`referredBy\` int,
    \`approvedBy\` int,
    \`approvalDate\` timestamp,
    \`notes\` text,
    \`paymentStatus\` enum('unpaid','paid','exempted') NOT NULL DEFAULT 'unpaid',
    \`paymentTxnId\` varchar(255),
    \`amountPaid\` varchar(50),
    \`paymentType\` enum('lifetime_one_time','yearly_subscription','admin_exempted'),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`members_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`donations\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int,
    \`donorName\` varchar(255) NOT NULL,
    \`donorEmail\` varchar(320) NOT NULL,
    \`donorPhone\` varchar(20),
    \`donorPan\` varchar(20),
    \`donorAddress\` text,
    \`amount\` decimal(12,2) NOT NULL,
    \`currency\` varchar(10) NOT NULL DEFAULT 'INR',
    \`purpose\` varchar(255),
    \`campaignId\` int,
    \`paymentMethod\` varchar(50),
    \`paymentStatus\` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    \`razorpayOrderId\` varchar(255),
    \`razorpayPaymentId\` varchar(255),
    \`receiptNumber\` varchar(50) UNIQUE,
    \`receiptUrl\` text,
    \`isAnonymous\` boolean NOT NULL DEFAULT false,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`donations_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`campaigns\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`description\` longtext,
    \`targetAmount\` decimal(12,2) NOT NULL,
    \`raisedAmount\` decimal(12,2) NOT NULL DEFAULT '0.00',
    \`startDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`endDate\` timestamp,
    \`status\` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
    \`imageUrl\` text,
    \`category\` varchar(100),
    \`beneficiaryDetails\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`campaigns_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`events\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`description\` longtext,
    \`eventDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`location\` varchar(255),
    \`category\` varchar(100),
    \`status\` enum('upcoming','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming',
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`events_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`gallery\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`description\` text,
    \`imageUrl\` text,
    \`redirectUrl\` text,
    \`mediaType\` enum('image','video') NOT NULL DEFAULT 'image',
    \`category\` varchar(100),
    \`uploadedBy\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`gallery_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`enquiries\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`email\` varchar(320) NOT NULL,
    \`phone\` varchar(20),
    \`subject\` varchar(255),
    \`message\` longtext NOT NULL,
    \`status\` enum('new','in_progress','resolved','closed') NOT NULL DEFAULT 'new',
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`enquiries_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`beneficiaries\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`phone\` varchar(20),
    \`address\` text,
    \`category\` varchar(100),
    \`status\` varchar(50) DEFAULT 'active',
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`beneficiaries_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`expenses\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`amount\` decimal(12,2) NOT NULL,
    \`category\` varchar(100) NOT NULL,
    \`expenseDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`description\` text,
    \`receiptUrl\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`expenses_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`news\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`content\` longtext NOT NULL,
    \`publishedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`category\` varchar(100),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`news_id\` PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`auditLogs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int,
    \`action\` varchar(255) NOT NULL,
    \`details\` text,
    \`ipAddress\` varchar(45),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`auditLogs_id\` PRIMARY KEY(\`id\`)
  )`
];

let initPromise: Promise<void> | null = null;

export async function ensureDatabaseReady(databaseUrl?: string): Promise<void> {
  const dbUrl = databaseUrl || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[Database] No DATABASE_URL found.");
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      let connection;
      try {
        console.log("[Database] Connecting to verify and initialize database tables...");
        connection = await mysql.createConnection(dbUrl);

        for (const query of TABLE_DEFINITIONS) {
          try {
            await connection.query(query);
          } catch (qErr: any) {
            // Ignore minor duplicate warnings
          }
        }
        console.log("[Database] ✅ All database tables verified and ready.");

        // Automatically seed admin user if configured
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
