import { z } from "zod";
import { publicProcedure, router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { beneficiaries, donations } from "../../drizzle/schema";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { paginationInput as sharedPaginationInput, escapeLikePattern } from "../_core/shared";

const paginationInput = sharedPaginationInput.extend({
  status: z.enum(["pending", "active", "inactive", "completed", "rejected"]).optional(),
});

export const beneficiaryRouter = router({
  // List active beneficiaries / villagers (public)
  getAll: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [eq(beneficiaries.status, "active")];
      if (input?.category && input.category !== "all") {
        conditions.push(eq(beneficiaries.category, input.category as any));
      }

      return db
        .select()
        .from(beneficiaries)
        .where(and(...conditions))
        .orderBy(desc(beneficiaries.createdAt));
    }),

  // List active beneficiaries (public alias)
  list: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [eq(beneficiaries.status, "active")];
      if (input?.category && input.category !== "all") {
        conditions.push(eq(beneficiaries.category, input.category as any));
      }

      return db
        .select()
        .from(beneficiaries)
        .where(and(...conditions))
        .orderBy(desc(beneficiaries.createdAt));
    }),

  // Search beneficiaries (public)
  search: publicProcedure
    .input(z.object({ query: z.string(), category: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [eq(beneficiaries.status, "active")];
      if (input.query) {
        conditions.push(like(beneficiaries.name, `%${escapeLikePattern(input.query)}%`));
      }
      if (input.category && input.category !== "all") {
        conditions.push(eq(beneficiaries.category, input.category as any));
      }

      return db
        .select()
        .from(beneficiaries)
        .where(and(...conditions))
        .orderBy(desc(beneficiaries.createdAt));
    }),

  // Create/Apply beneficiary (protected/member)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
        address: z.string().min(5, "Address is required"),
        category: z.enum(["education", "health", "livelihood", "emergency", "other"]),
        notes: z.string().optional(),
        profileImage: z.string().optional(), // Base64 image
        requestedAmount: z.number().nonnegative().default(0),
        targetEmail: z.string().email().optional().or(z.literal("")),
        executionPlan: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let profileImageUrl: string | null = null;
      if (input.profileImage) {
        try {
          const base64Data = input.profileImage.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const uploadResult = await storagePut(`beneficiary_${Date.now()}`, buffer);
          profileImageUrl = uploadResult.url;
        } catch (error) {
          console.error("Cloudinary upload failed for beneficiary profile:", error);
        }
      }

      await db.insert(beneficiaries).values({
        userId: ctx.user.id,
        name: input.name,
        email: input.email || null,
        phone: input.phone,
        address: input.address,
        category: input.category,
        notes: input.notes || null,
        profileImage: profileImageUrl,
        requestedAmount: input.requestedAmount.toString(),
        collectedAmount: "0.00",
        targetEmail: input.targetEmail || null,
        executionPlan: input.executionPlan || null,
        status: "pending",
      });

      return { success: true };
    }),

  // Help a beneficiary directly (public)
  helpDirectly: publicProcedure
    .input(
      z.object({
        beneficiaryId: z.number(),
        amount: z.number().positive("Amount must be positive"),
        donorName: z.string().min(2, "Name is required"),
        donorEmail: z.string().email().optional().or(z.literal("")),
        donorPhone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
        transactionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const beneficiaryList = await db
        .select()
        .from(beneficiaries)
        .where(eq(beneficiaries.id, input.beneficiaryId))
        .limit(1);

      if (beneficiaryList.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Beneficiary not found" });
      }

      const beneficiary = beneficiaryList[0];
      const receiptNumber = `RCP-BEN-${Date.now()}`;

      // Insert donation record (representing the direct helper transfer)
      await db.insert(donations).values({
        donorName: input.donorName,
        donorEmail: input.donorEmail || null,
        donorPhone: input.donorPhone || null,
        amount: input.amount.toString(),
        donationType: "transfer",
        paymentStatus: "completed",
        purpose: `Direct Help for Beneficiary: ${beneficiary.name}`,
        beneficiaryId: input.beneficiaryId,
        transactionId: input.transactionId || null,
        receiptNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update beneficiary collected amount
      const currentCollected = parseFloat(beneficiary.collectedAmount || "0");
      const newCollected = currentCollected + input.amount;

      await db
        .update(beneficiaries)
        .set({
          collectedAmount: newCollected.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(beneficiaries.id, input.beneficiaryId));

      return { success: true, receiptNumber };
    }),

  // Get all beneficiaries (admin, paginated)
  adminGetAll: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const conditions = [];
      if (input.status) {
        conditions.push(eq(beneficiaries.status, input.status));
      }

      const items = await db
        .select()
        .from(beneficiaries)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(beneficiaries.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(beneficiaries)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Update beneficiary status (admin)
  adminUpdateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "active", "inactive", "completed", "rejected"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(beneficiaries)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(beneficiaries.id, input.id));

      return { success: true };
    }),

  // Detailed admin update for approvals/modifications
  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
        address: z.string().min(5),
        category: z.enum(["education", "health", "livelihood", "emergency", "other"]),
        notes: z.string().optional(),
        requestedAmount: z.number().nonnegative(),
        targetEmail: z.string().email().optional().or(z.literal("")),
        executionPlan: z.string().optional(),
        status: z.enum(["pending", "active", "inactive", "completed", "rejected"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(beneficiaries)
        .set({
          name: input.name,
          email: input.email || null,
          phone: input.phone,
          address: input.address,
          category: input.category,
          notes: input.notes || null,
          requestedAmount: input.requestedAmount.toString(),
          targetEmail: input.targetEmail || null,
          executionPlan: input.executionPlan || null,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(beneficiaries.id, input.id));

      return { success: true };
    }),

  // Add beneficiary directly (admin)
  adminCreate: adminProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
        address: z.string().min(5, "Address is required"),
        category: z.enum(["education", "health", "livelihood", "emergency", "other"]),
        notes: z.string().optional(),
        profileImage: z.string().optional(), // Direct Image URL from ImageUpload
        requestedAmount: z.number().nonnegative().default(0),
        targetEmail: z.string().email().optional().or(z.literal("")),
        executionPlan: z.string().optional(),
        status: z.enum(["pending", "active", "inactive", "completed", "rejected"]).default("active"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(beneficiaries).values({
        name: input.name,
        email: input.email || null,
        phone: input.phone,
        address: input.address,
        category: input.category,
        notes: input.notes || null,
        profileImage: input.profileImage || null,
        requestedAmount: input.requestedAmount.toString(),
        collectedAmount: "0.00",
        targetEmail: input.targetEmail || null,
        executionPlan: input.executionPlan || null,
        status: input.status,
      });

      return { success: true };
    }),

  // Delete beneficiary record (admin)
  adminDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(beneficiaries).where(eq(beneficiaries.id, input.id));

      return { success: true };
    }),
});
