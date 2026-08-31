import { z } from "zod";
import { publicProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { projects } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { paginationInput } from "../_core/shared";

export const projectRouter = router({
  // Get all active projects (public)
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return db
      .select()
      .from(projects)
      .where(eq(projects.status, "active"))
      .orderBy(desc(projects.createdAt));
  }),

  // Get project by ID (public)
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  // Get all projects for admin (paginated)
  adminGetAll: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(projects)
        .orderBy(desc(projects.createdAt))
        .limit(input.pageSize)
        .offset(offset);
        
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(projects);
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Create project
  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        image: z.string().optional(),
        status: z.enum(["active", "completed", "draft"]).default("active"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(projects).values({
        title: input.title,
        description: input.description,
        image: input.image || null,
        status: input.status,
      });

      return { success: true };
    }),

  // Update project
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        image: z.string().optional(),
        status: z.enum(["active", "completed", "draft"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(projects)
        .set({
          title: input.title,
          description: input.description,
          image: input.image || null,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.id));

      return { success: true };
    }),

  // Delete project
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(projects).where(eq(projects.id, input.id));

      return { success: true };
    }),
});
