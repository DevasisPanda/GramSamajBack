import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { tickerNews } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const newsRouter = router({
  // Fetch active announcements (public)
  list: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        return await db
          .select()
          .from(tickerNews)
          .where(eq(tickerNews.isActive, true))
          .orderBy(desc(tickerNews.createdAt))
          .limit(6);
      } catch (error) {
        console.error("Error fetching active ticker news:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to fetch ticker news: ',
        });
      }
    }),

  // Fetch all announcements for admin management
  adminList: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        return await db
          .select()
          .from(tickerNews)
          .orderBy(desc(tickerNews.createdAt));
      } catch (error) {
        console.error("Error fetching all ticker news:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to fetch ticker news list: ',
        });
      }
    }),

  // Create news
  create: adminProcedure
    .input(
      z.object({
        text: z.string().min(1, "News text is required").max(500, "News text cannot exceed 500 characters"),
        link: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        await db.insert(tickerNews).values({
          text: input.text,
          link: input.link || null,
          isActive: true,
        });
        return { success: true, message: "Announcement published successfully" };
      } catch (error) {
        console.error("Error creating ticker news:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to publish announcement: ',
        });
      }
    }),

  // Toggle active status
  toggleActive: adminProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        await db
          .update(tickerNews)
          .set({ isActive: input.isActive })
          .where(eq(tickerNews.id, input.id));
        return { success: true, message: `Announcement ${input.isActive ? "activated" : "deactivated"} successfully` };
      } catch (error) {
        console.error("Error toggling ticker news active state:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to toggle active state: ',
        });
      }
    }),

  // Delete news
  delete: adminProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        await db.delete(tickerNews).where(eq(tickerNews.id, input.id));
        return { success: true, message: "Announcement deleted successfully", deletedId: input.id };
      } catch (error) {
        console.error("Error deleting ticker news:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete announcement",
        });
      }
    }),

  // Update news
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        text: z.string().min(1, "News text is required").max(500, "News text cannot exceed 500 characters"),
        link: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        await db
          .update(tickerNews)
          .set({
            text: input.text,
            link: input.link || null,
            updatedAt: new Date(),
          })
          .where(eq(tickerNews.id, input.id));
        return { success: true, message: "Announcement updated successfully" };
      } catch (error) {
        console.error("Error updating ticker news:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to update announcement: ',
        });
      }
    }),
});
