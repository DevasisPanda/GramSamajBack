import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditReports, achievements } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../utils/audit";

export const websiteRouter = router({
  // Audit Reports Operations
  getAudits: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    try {
      return await db.select().from(auditReports).orderBy(desc(auditReports.createdAt));
    } catch (error) {
      console.error("Error fetching audits:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: 'Failed to fetch audits: ',
      });
    }
  }),

  createAudit: adminProcedure
    .input(
      z.object({
        name: z.string(),
        imageUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      try {
        const [insertResult] = await db.insert(auditReports).values({
          name: input.name,
          imageUrl: input.imageUrl || null,
        });

        await logAuditEvent(
          db,
          ctx.user.id,
          "CREATE_AUDIT",
          "audit_reports",
          insertResult.insertId,
          { name: input.name },
          ctx.req.ip
        );

        return { success: true, message: "Audit report added successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to add audit report: ',
        });
      }
    }),

  updateAudit: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string(),
        imageUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      try {
        await db
          .update(auditReports)
          .set({
            name: input.name,
            imageUrl: input.imageUrl || null,
          })
          .where(eq(auditReports.id, input.id));

        await logAuditEvent(
          db,
          ctx.user.id,
          "UPDATE_AUDIT",
          "audit_reports",
          input.id,
          { name: input.name },
          ctx.req.ip
        );

        return { success: true, message: "Audit report updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to update audit report: ',
        });
      }
    }),

  deleteAudit: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      try {
        await db.delete(auditReports).where(eq(auditReports.id, input.id));
        
        await logAuditEvent(
          db,
          ctx.user.id,
          "DELETE_AUDIT",
          "audit_reports",
          input.id,
          null,
          ctx.req.ip
        );

        return { success: true, message: "Audit report deleted successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to delete audit report: ',
        });
      }
    }),

  // Achievements Operations
  getAchievements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    try {
      return await db.select().from(achievements).orderBy(desc(achievements.createdAt));
    } catch (error) {
      console.error("Error fetching achievements:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch achievements",
      });
    }
  }),

  createAchievement: adminProcedure
    .input(
      z.object({
        title: z.string(),
        imageUrl: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      try {
        const [insertResult] = await db.insert(achievements).values({
          title: input.title,
          imageUrl: input.imageUrl || null,
          description: input.description || null,
        });

        await logAuditEvent(
          db,
          ctx.user.id,
          "CREATE_ACHIEVEMENT",
          "achievements",
          insertResult.insertId,
          { title: input.title },
          ctx.req.ip
        );

        return { success: true, message: "Achievement added successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to add achievement: ',
        });
      }
    }),

  updateAchievement: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string(),
        imageUrl: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      try {
        await db
          .update(achievements)
          .set({
            title: input.title,
            imageUrl: input.imageUrl || null,
            description: input.description || null,
          })
          .where(eq(achievements.id, input.id));

        await logAuditEvent(
          db,
          ctx.user.id,
          "UPDATE_ACHIEVEMENT",
          "achievements",
          input.id,
          { title: input.title },
          ctx.req.ip
        );

        return { success: true, message: "Achievement updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to update achievement: ',
        });
      }
    }),

  deleteAchievement: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      try {
        await db.delete(achievements).where(eq(achievements.id, input.id));
        
        await logAuditEvent(
          db,
          ctx.user.id,
          "DELETE_ACHIEVEMENT",
          "achievements",
          input.id,
          null,
          ctx.req.ip
        );

        return { success: true, message: "Achievement deleted successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to delete achievement: ',
        });
      }
    }),

  // ==========================================
  // Live Visitor Counter (Reliable & Database-backed)
  // ==========================================
  getVisitorCount: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 18450 };

    try {
      // Ensure visitor counter table exists
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS site_visitor_counter (
          id INT PRIMARY KEY DEFAULT 1,
          total_visits BIGINT NOT NULL DEFAULT 18450,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      // Ensure row with id=1 exists
      await db.execute(sql`
        INSERT IGNORE INTO site_visitor_counter (id, total_visits) VALUES (1, 18450);
      `);

      const [rows]: any = await db.execute(sql`
        SELECT total_visits FROM site_visitor_counter WHERE id = 1 LIMIT 1;
      `);

      const count = rows?.[0]?.total_visits ? Number(rows[0].total_visits) : 18450;
      return { count };
    } catch (error) {
      console.error("[VisitorCounter] Error fetching visitor count:", error);
      return { count: 18450 };
    }
  }),

  recordVisit: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { count: 18451 };

    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS site_visitor_counter (
          id INT PRIMARY KEY DEFAULT 1,
          total_visits BIGINT NOT NULL DEFAULT 18450,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await db.execute(sql`
        INSERT INTO site_visitor_counter (id, total_visits) 
        VALUES (1, 18451)
        ON DUPLICATE KEY UPDATE total_visits = total_visits + 1;
      `);

      const [rows]: any = await db.execute(sql`
        SELECT total_visits FROM site_visitor_counter WHERE id = 1 LIMIT 1;
      `);

      const count = rows?.[0]?.total_visits ? Number(rows[0].total_visits) : 18451;
      return { count };
    } catch (error) {
      console.error("[VisitorCounter] Error recording visit:", error);
      return { count: 18451 };
    }
  }),
});
