import { z } from "zod";
import { publicProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { gallery } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../utils/audit";

export const galleryRouter = router({
  // Get all active/public gallery items
  getPublic: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return db.select().from(gallery).orderBy(desc(gallery.createdAt));
  }),

  // Get all gallery items (for admin)
  adminGetAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return db.select().from(gallery).orderBy(desc(gallery.createdAt));
  }),

  // Create/upload a new gallery item
  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        imageUrl: z.string().min(1, "Media URL is required"),
        category: z.string().optional(),
        mediaType: z.enum(["image", "video"]).default("image"),
        redirectUrl: z.string().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [insertResult] = await db.insert(gallery).values({
        title: input.title,
        description: input.description || null,
        imageUrl: input.imageUrl,
        category: input.category || null,
        mediaType: input.mediaType,
        redirectUrl: input.redirectUrl || null,
        uploadedBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditEvent(
        db,
        ctx.user.id,
        "CREATE_GALLERY",
        "gallery",
        insertResult.insertId,
        { title: input.title, mediaType: input.mediaType },
        ctx.req.ip
      );

      return { success: true };
    }),

  // Update a gallery item
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        imageUrl: z.string().min(1).optional(),
        category: z.string().optional(),
        mediaType: z.enum(["image", "video"]).optional(),
        redirectUrl: z.string().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const patch: Record<string, any> = { updatedAt: new Date() };
      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description || null;
      if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
      if (input.category !== undefined) patch.category = input.category || null;
      if (input.mediaType !== undefined) patch.mediaType = input.mediaType;
      if (input.redirectUrl !== undefined) patch.redirectUrl = input.redirectUrl || null;

      await db.update(gallery).set(patch).where(eq(gallery.id, input.id));

      await logAuditEvent(
        db,
        ctx.user.id,
        "UPDATE_GALLERY",
        "gallery",
        input.id,
        patch,
        ctx.req.ip
      );

      return { success: true };
    }),

  // Delete a gallery item
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(gallery).where(eq(gallery.id, input.id));
      
      await logAuditEvent(
        db,
        ctx.user.id,
        "DELETE_GALLERY",
        "gallery",
        input.id,
        null,
        ctx.req.ip
      );

      return { success: true };
    }),
});
