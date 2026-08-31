import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { donations, campaigns } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { paginationInput } from "../_core/shared";
import { deliverReceiptViaWhatsApp, deliverReceiptViaEmail } from "../services/receipt";

export const donationRouter = router({
  // Create donation
  create: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        donationType: z.enum(["online", "cash", "check", "transfer"]),
        campaignId: z.number().optional(),
        purpose: z.string().optional(),
        donorName: z.string().optional(),
        donorEmail: z.string().optional(),
        donorPhone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
        simulateSuccess: z.boolean().optional(),
        transactionId: z.string().optional(),
        notes: z.string().optional(),
        paymentProof: z.string().optional(),
        createdAt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      if (ctx.user.role !== "admin" && input.donationType !== "online") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can record offline donations" });
      }

      // Allow online donation creation for authenticated members and admins

      const receiptNumber = `RCP-${nanoid(10).toUpperCase()}`;
      const paymentStatus = ctx.user.role === "admin" && input.donationType !== "online"
        ? "completed"
        : (input.simulateSuccess && process.env.NODE_ENV === "development" ? "completed" : "pending");

      await db.insert(donations).values({
        donorId: ctx.user.id,
        donorName: input.donorName || ctx.user.name,
        donorEmail: input.donorEmail || ctx.user.email,
        donorPhone: input.donorPhone,
        amount: input.amount.toString(),
        donationType: input.donationType,
        campaignId: input.campaignId,
        receiptNumber,
        paymentStatus,
        purpose: input.purpose,
        transactionId: input.transactionId || null,
        notes: input.notes || null,
        paymentProof: input.paymentProof || null,
        createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
        updatedAt: new Date(),
      });

      // Auto-completion check for campaigns
      if (input.campaignId && paymentStatus === "completed") {
        const campaign = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
        if (campaign.length > 0 && campaign[0].status === "active") {
          const [sumResult] = await db
            .select({ total: sql<string>`sum(cast(amount as decimal(10,2)))` })
            .from(donations)
            .where(
              and(
                eq(donations.campaignId, input.campaignId),
                eq(donations.paymentStatus, "completed")
              )
            );
          const totalRaised = parseFloat(sumResult?.total || "0");
          const goalAmount = parseFloat(campaign[0].goalAmount as unknown as string);
          
          if (totalRaised >= goalAmount) {
            await db.update(campaigns).set({ status: "completed", updatedAt: new Date() }).where(eq(campaigns.id, input.campaignId));
          }
        }
      }

      return { success: true, receiptNumber };
    }),

  // Get my donations (paginated)
  getMyDonations: protectedProcedure
    .input(paginationInput)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(donations)
        .where(eq(donations.donorId, ctx.user.id))
        .orderBy(desc(donations.createdAt))
        .limit(input.pageSize)
        .offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(donations).where(eq(donations.donorId, ctx.user.id));
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Get recent public donations (safe for public display, no PII)
  getRecentPublic: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const limit = input?.limit ?? 20;
      const rows = await db
        .select({
          id: donations.id,
          donorName: donations.donorName,
          amount: donations.amount,
          purpose: donations.purpose,
          paymentMethod: donations.paymentMethod,
          createdAt: donations.createdAt,
        })
        .from(donations)
        .where(eq(donations.paymentStatus, "completed"))
        .orderBy(desc(donations.createdAt))
        .limit(limit);

      return rows;
    }),

  // Record a public donor pledge / intent
  createPublic: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits").optional().or(z.literal("")),
        amount: z.number().positive("Amount must be positive"),
        paymentMode: z.string().optional(),
        purpose: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const receiptNumber = `RCP-${nanoid(10).toUpperCase()}`;
      await db.insert(donations).values({
        donorName: input.name,
        donorEmail: input.email || null,
        donorPhone: input.phone || null,
        amount: input.amount.toString(),
        donationType: "online",
        paymentMethod: input.paymentMode || "RAZORPAY",
        purpose: input.purpose || "General Donation",
        receiptNumber,
        paymentStatus: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, receiptNumber };
    }),

  // Get all donations (admin only, paginated)
  getAll: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db.select().from(donations).orderBy(desc(donations.createdAt)).limit(input.pageSize).offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(donations);
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Get donations by campaign (paginated)
  getByCampaign: adminProcedure
    .input(z.object({ campaignId: z.number(), page: z.number().min(1).default(1), pageSize: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(donations)
        .where(eq(donations.campaignId, input.campaignId))
        .orderBy(desc(donations.createdAt))
        .limit(input.pageSize)
        .offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(donations).where(eq(donations.campaignId, input.campaignId));
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Get donation stats (admin only)
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const statsResult = await db.select({
      total: sql<string>`sum(cast(amount as decimal(10,2)))`,
      count: sql<number>`count(*)`,
      avg: sql<string>`avg(cast(amount as decimal(10,2)))`,
    }).from(donations);

    const typeStats = await db.select({
      donationType: donations.donationType,
      count: sql<number>`count(*)`,
    }).from(donations).groupBy(donations.donationType);

    const stats = statsResult[0] || { total: "0", count: 0, avg: "0" };
    const totalDonations = parseFloat(stats.total || "0");
    const totalCount = stats.count || 0;
    const averageDonation = parseFloat(stats.avg || "0");

    const byType = { online: 0, cash: 0, check: 0, transfer: 0 };
    for (const row of typeStats) {
      if (row.donationType in byType) {
        byType[row.donationType as keyof typeof byType] = row.count;
      }
    }

    const [completedCountResult] = await db.select({ count: sql<number>`count(*)` }).from(donations).where(eq(donations.paymentStatus, "completed"));
    const [pendingCountResult] = await db.select({ count: sql<number>`count(*)` }).from(donations).where(eq(donations.paymentStatus, "pending"));

    const completedCount = completedCountResult?.count ?? 0;
    const pendingCount = pendingCountResult?.count ?? 0;

    return {
      totalDonations,
      totalCount,
      averageDonation,
      byType,
      totalAmount: totalDonations,
      completedCount,
      pendingCount,
    };
  }),

  // Update donation status (admin only)
  updateStatus: adminProcedure
    .input(z.object({ donationId: z.number(), paymentStatus: z.enum(["pending", "completed", "failed", "refunded"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(donations)
        .set({ paymentStatus: input.paymentStatus, updatedAt: new Date() })
        .where(eq(donations.id, input.donationId));

      return { success: true };
    }),

  // Get donor history (paginated)
  getDonorHistory: protectedProcedure
    .input(z.object({ donorId: z.number(), page: z.number().min(1).default(1), pageSize: z.number().min(1).max(100).default(20) }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.id !== input.donorId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(donations)
        .where(eq(donations.donorId, input.donorId))
        .orderBy(desc(donations.createdAt))
        .limit(input.pageSize)
        .offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(donations).where(eq(donations.donorId, input.donorId));
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Update donation (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        donorName: z.string().optional(),
        donorEmail: z.string().optional(),
        donorPhone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
        amount: z.number().positive(),
        donationType: z.enum(["online", "cash", "check", "transfer"]),
        paymentStatus: z.enum(["pending", "completed", "failed", "refunded"]),
        purpose: z.string().optional(),
        notes: z.string().optional(),
        paymentProof: z.string().optional(),
        transactionId: z.string().optional(),
        createdAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updateData: any = {
        donorName: input.donorName || null,
        donorEmail: input.donorEmail || null,
        donorPhone: input.donorPhone || null,
        amount: input.amount.toString(),
        donationType: input.donationType,
        paymentStatus: input.paymentStatus,
        purpose: input.purpose || null,
        notes: input.notes || null,
        paymentProof: input.paymentProof || null,
        transactionId: input.transactionId || null,
        updatedAt: new Date(),
      };

      if (input.createdAt) {
        updateData.createdAt = new Date(input.createdAt);
      }

      await db
        .update(donations)
        .set(updateData)
        .where(eq(donations.id, input.id));

      return { success: true, message: "Donation entry updated successfully" };
    }),

  // Delete donation (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(donations).where(eq(donations.id, input.id));

      return { success: true, message: "Donation entry deleted successfully" };
    }),

  // Get live receipt details (with Razorpay integration)
  getDonationReceiptDetails: adminProcedure
    .input(z.object({ donationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const donationRec = await db
        .select()
        .from(donations)
        .where(eq(donations.id, input.donationId))
        .limit(1);

      if (donationRec.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donation record not found" });
      }

      const donation = donationRec[0];
      
      // Default to database values
      let paymentMethod = donation.donationType.toUpperCase();
      let transactionId = donation.transactionId || donation.receiptNumber;

      if (donation.donationType === "online" && donation.transactionId && donation.transactionId.startsWith("pay_")) {
        try {
          const { getRazorpay } = await import("./payment");
          const razorpay = await getRazorpay();
          const payment = await razorpay.payments.fetch(donation.transactionId);
          
          if (payment) {
            if (payment.method === "upi") {
              paymentMethod = `UPI (${payment.vpa || "Unknown"})`;
            } else if (payment.method === "card") {
              const card = payment.card;
              paymentMethod = `Card (${card?.network || "Card"} ending in ${card?.last4 || "****"})`;
            } else if (payment.method === "netbanking") {
              paymentMethod = `Netbanking (${payment.bank || "Bank"})`;
            } else if (payment.method === "wallet") {
              paymentMethod = `Wallet (${payment.wallet || "Wallet"})`;
            } else {
              paymentMethod = `Online (${payment.method || "Razorpay"})`;
            }
            transactionId = payment.id;
          }
        } catch (error) {
          console.error("Failed to fetch payment details from Razorpay:", error);
        }
      }

      return {
        id: donation.id,
        donorName: donation.donorName,
        donorEmail: donation.donorEmail,
        donorPhone: donation.donorPhone,
        amount: donation.amount,
        purpose: donation.purpose,
        createdAt: donation.createdAt,
        receiptNumber: donation.receiptNumber,
        paymentMethod,
        transactionId,
      };
    }),

  // Resend receipt notification (admin only)
  resendReceiptNotification: adminProcedure
    .input(
      z.object({
        donationId: z.number(),
        channel: z.enum(["whatsapp", "email", "both"]).default("both"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [donation] = await db
        .select()
        .from(donations)
        .where(eq(donations.id, input.donationId))
        .limit(1);

      if (!donation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donation record not found" });
      }

      const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:5000";
      const pdfUrl = `${apiBaseUrl}/api/receipts/download/${donation.receiptNumber}.pdf`;

      const receiptData = {
        donationId: donation.id,
        receiptNumber: donation.receiptNumber || "",
        donorName: donation.donorName || "Anonymous Donor",
        donorEmail: donation.donorEmail || "",
        donorPhone: donation.donorPhone || "",
        amount: donation.amount.toString(),
        purpose: donation.purpose || "General Donation",
        paymentMethod: donation.paymentMethod || donation.donationType || "ONLINE",
        transactionId: donation.transactionId || donation.receiptNumber || "",
        createdAt: donation.createdAt,
      };

      const results: { whatsapp?: any; email?: any } = {};

      if (input.channel === "whatsapp" || input.channel === "both") {
        results.whatsapp = await deliverReceiptViaWhatsApp(receiptData, pdfUrl);
      }
      if (input.channel === "email" || input.channel === "both") {
        results.email = await deliverReceiptViaEmail(receiptData, pdfUrl);
      }

      return { success: true, results };
    }),
});
