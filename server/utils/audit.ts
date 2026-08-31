import { auditLogs } from "../../drizzle/schema";

/**
 * Reusable helper to insert records into the auditLogs table.
 * Wraps operations in a try/catch to prevent audit log failures from failing the main operation.
 */
export async function logAuditEvent(
  db: any,
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null = null,
  changes: any = null,
  ipAddress: string | null = null
) {
  try {
    if (!db) return;
    
    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId,
      changes: changes || null,
      ipAddress,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to write audit log event:", error);
  }
}
