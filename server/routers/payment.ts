import { z } from "zod";
import { createHmac } from "crypto";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { paymentTransactions, donations, campaigns } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { paginationInput } from "../_core/shared";
import { deliverReceiptViaWhatsApp, deliverReceiptViaEmail } from "../services/receipt";

const normalizeNumerals = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  const numeralsMap: Record<string, string> = {
    // Hindi/Devanagari
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
    // Gujarati
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };
  return val.replace(/[०-९૦-૯]/g, (char) => numeralsMap[char] || char);
};

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

// Lazily import razorpay (avoids crash when env vars aren't set)
let razorpayClient: any = null;
export async function getRazorpay() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    });
  }
  if (!razorpayClient) {
    const { default: Razorpay } = await import("razorpay");
    razorpayClient = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

import { timingSafeEqual } from "crypto";

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const expected = createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  
  const expectedBuf = Buffer.from(expected, "utf-8");
  const signatureBuf = Buffer.from(signature, "utf-8");

  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, signatureBuf);
}

export const paymentRouter = router({
  /**
   * Create a Razorpay order and store a pending payment transaction.
   * Public — no auth required so anonymous users can donate.
   */
  createOrder: publicProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.string().default("INR"),
        donorName: z.string().min(1, "Name is required"),
        donorEmail: z.string().email("Valid email is required"),
        donorPhone: z.preprocess(
          normalizeNumerals,
          z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal(""))
        ),
        purpose: z.string().optional(),
        campaignId: z.number().optional(),
        donorId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const razorpay = await getRazorpay();

      // Create order with Razorpay (amount in paise)
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(input.amount * 100), // INR → paise
        currency: input.currency,
        receipt: `RCPT-${nanoid(10).toUpperCase()}`,
        notes: {
          purpose: input.purpose || "general",
          donorName: input.donorName,
          donorEmail: input.donorEmail,
        },
      });

      // Persist the payment transaction record
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(paymentTransactions).values({
        transactionId: razorpayOrder.id,
        amount: input.amount.toString(),
        status: "initiated",
        paymentMethod: "razorpay",
        razorpayOrderId: razorpayOrder.id,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone,
        donorId: input.donorId || null,
        purpose: input.purpose || null,
        campaignId: input.campaignId || null,
      });

      return {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency,
        keyId: RAZORPAY_KEY_ID,
      };
    }),

  /**
   * Verify a successful Razorpay payment, create the donation, and
   * mark the transaction as completed.
   * Public — called from the frontend after Razorpay checkout success.
   */
  verifyPayment: publicProcedure
    .input(
      z.object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify signature
      const isValid = verifyRazorpaySignature(
        input.razorpayOrderId,
        input.razorpayPaymentId,
        input.razorpaySignature
      );

      if (!isValid) {
        // Mark transaction as failed
        await db
          .update(paymentTransactions)
          .set({
            status: "failed",
            razorpayPaymentId: input.razorpayPaymentId,
            razorpaySignature: input.razorpaySignature,
            updatedAt: new Date(),
          })
          .where(eq(paymentTransactions.razorpayOrderId, input.razorpayOrderId));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment verification failed. Invalid signature.",
        });
      }

      // Find the transaction record
      const [txn] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.razorpayOrderId, input.razorpayOrderId))
        .limit(1);

      if (!txn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment transaction not found.",
        });
      }

      if (txn.status === "completed") {
        return {
          success: true,
          message: "Payment already verified.",
          receiptNumber: txn.transactionId,
        };
      }

      // Create donation record
      const receiptNumber = `RCP-${nanoid(10).toUpperCase()}`;
      const donationAmount = parseFloat(txn.amount.toString());

      const [insertResult] = await db
        .insert(donations)
        .values({
          donorId: txn.donorId || null,
          donorName: txn.donorName,
          donorEmail: txn.donorEmail,
          donorPhone: txn.donorPhone,
          amount: donationAmount.toString(),
          donationType: "online",
          paymentMethod: "razorpay",
          transactionId: input.razorpayPaymentId,
          paymentStatus: "completed",
          purpose: txn.purpose,
          campaignId: txn.campaignId || undefined,
          receiptNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const donationId = insertResult.insertId;

      // Update payment transaction to link the donation
      await db
        .update(paymentTransactions)
        .set({
          status: "completed",
          donationId: donationId,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          responseData: {
            razorpayPaymentId: input.razorpayPaymentId,
          },
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.razorpayOrderId, input.razorpayOrderId));

      // Auto-update campaign raised amount
      if (txn.campaignId) {
        const [sumResult] = await db
          .select({ total: sql<string>`sum(cast(amount as decimal(10,2)))` })
          .from(donations)
          .where(
            and(
              eq(donations.campaignId, txn.campaignId),
              eq(donations.paymentStatus, "completed")
            )
          );

        const totalRaised = parseFloat(sumResult?.total || "0");
        await db
          .update(campaigns)
          .set({ raisedAmount: totalRaised.toString(), updatedAt: new Date() })
          .where(eq(campaigns.id, txn.campaignId));

        // Auto-complete campaign if goal reached
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, txn.campaignId))
          .limit(1);

        if (
          campaign &&
          campaign.status === "active" &&
          totalRaised >= parseFloat(campaign.goalAmount as unknown as string)
        ) {
          await db
            .update(campaigns)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(campaigns.id, txn.campaignId));
        }
      }

      // Fire-and-forget: deliver receipt via WhatsApp & Email
      const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:5000";
      const pdfUrl = `${apiBaseUrl}/api/receipts/download/${receiptNumber}.pdf`;
      const receiptData = {
        donationId,
        receiptNumber,
        donorName: txn.donorName || "Anonymous Donor",
        donorEmail: txn.donorEmail || "",
        donorPhone: txn.donorPhone || "",
        amount: txn.amount,
        purpose: txn.purpose || "General Donation",
        paymentMethod: "razorpay",
        transactionId: input.razorpayPaymentId,
        createdAt: new Date(),
      };
      setImmediate(() => {
        deliverReceiptViaWhatsApp(receiptData, pdfUrl).catch((e) => console.error("[Payment] WhatsApp delivery failed:", e));
        deliverReceiptViaEmail(receiptData, pdfUrl).catch((e) => console.error("[Payment] Email delivery failed:", e));
      });

      return {
        success: true,
        donationId: donationId,
        receiptNumber,
        message: "Payment verified and donation recorded successfully.",
      };
    }),

  /**
   * Get all payment transactions (admin only).
   */
  getAll: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(paymentTransactions)
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentTransactions);
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * Create a payment transaction manually (admin only).
   */
  adminCreate: adminProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        donorName: z.string().min(1, "Name is required"),
        donorEmail: z.string().email("Valid email is required"),
        donorPhone: z.preprocess(
          normalizeNumerals,
          z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal(""))
        ),
        purpose: z.string().optional(),
        status: z.enum(["initiated", "completed", "failed"]).default("initiated"),
        transactionId: z.string().optional(),
        paymentMethod: z.string().default("manual"),
        razorpayOrderId: z.string().optional(),
        razorpayPaymentId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const txnId = input.transactionId || `TXN-${nanoid(10).toUpperCase()}`;

      await db.insert(paymentTransactions).values({
        transactionId: txnId,
        amount: input.amount.toString(),
        status: input.status,
        paymentMethod: input.paymentMethod,
        razorpayOrderId: input.razorpayOrderId || null,
        razorpayPaymentId: input.razorpayPaymentId || null,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone || null,
        purpose: input.purpose || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, message: "Transaction record created successfully" };
    }),

  /**
   * Update a payment transaction record (admin only).
   */
  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.number(),
        amount: z.number().positive().optional(),
        donorName: z.string().min(1, "Name is required").optional(),
        donorEmail: z.string().email("Valid email is required").optional(),
        donorPhone: z.preprocess(
          normalizeNumerals,
          z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal(""))
        ),
        purpose: z.string().optional(),
        status: z.enum(["initiated", "completed", "failed"]).optional(),
        transactionId: z.string().optional(),
        paymentMethod: z.string().optional(),
        razorpayOrderId: z.string().optional(),
        razorpayPaymentId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updateData: any = {
        updatedAt: new Date(),
      };
      if (input.amount !== undefined) updateData.amount = input.amount.toString();
      if (input.donorName !== undefined) updateData.donorName = input.donorName;
      if (input.donorEmail !== undefined) updateData.donorEmail = input.donorEmail;
      if (input.donorPhone !== undefined) updateData.donorPhone = input.donorPhone || null;
      if (input.purpose !== undefined) updateData.purpose = input.purpose || null;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.transactionId !== undefined) updateData.transactionId = input.transactionId;
      if (input.paymentMethod !== undefined) updateData.paymentMethod = input.paymentMethod;
      if (input.razorpayOrderId !== undefined) updateData.razorpayOrderId = input.razorpayOrderId || null;
      if (input.razorpayPaymentId !== undefined) updateData.razorpayPaymentId = input.razorpayPaymentId || null;

      await db.update(paymentTransactions).set(updateData).where(eq(paymentTransactions.id, input.id));

      return { success: true, message: "Transaction record updated successfully" };
    }),

  /**
   * Create a Razorpay subscription and store an initiated transaction record.
   * Public procedure.
   */
  createSubscription: publicProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        donorName: z.string().min(1, "Name is required"),
        donorEmail: z.string().email("Valid email is required"),
        donorPhone: z.preprocess(
          normalizeNumerals,
          z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal(""))
        ),
        purpose: z.string().optional(),
        campaignId: z.number().optional(),
        intervalType: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]).default("monthly"),
      })
    )
    .mutation(async ({ input }) => {
      const razorpay = await getRazorpay();

      // Map interval types to Razorpay period and interval specifications
      let period: "monthly" | "yearly" = "monthly";
      let interval = 1;
      let totalCount = 60; // Max billing occurrences (e.g. 60 months = 5 years)

      if (input.intervalType === "quarterly") {
        period = "monthly";
        interval = 3;
        totalCount = 20; // 20 quarters = 5 years
      } else if (input.intervalType === "half_yearly") {
        period = "monthly";
        interval = 6;
        totalCount = 10; // 10 half-years = 5 years
      } else if (input.intervalType === "yearly") {
        period = "yearly";
        interval = 1;
        totalCount = 5; // 5 years
      }

      // 1. Create a dynamic plan on Razorpay matching the interval
      const plan = await razorpay.plans.create({
        period,
        interval,
        item: {
          name: `${input.purpose || "Donation"} - ${input.intervalType.replace("_", " ")}`,
          amount: Math.round(input.amount * 100), // INR -> paise
          currency: "INR",
          description: `Recurring Donation - ${input.intervalType}`
        }
      });

      // 2. Create the subscription
      const subscription = await razorpay.subscriptions.create({
        plan_id: plan.id,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          purpose: input.purpose || "recurring_donation",
          intervalType: input.intervalType,
          donorName: input.donorName,
          donorEmail: input.donorEmail,
          campaignId: input.campaignId ? String(input.campaignId) : "",
        }
      });

      // 3. Save the initiated transaction in the database
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(paymentTransactions).values({
        transactionId: subscription.id,
        amount: input.amount.toString(),
        status: "initiated",
        paymentMethod: "razorpay_subscription",
        razorpayOrderId: subscription.id, // Using subscription ID as Order ID mapping
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone,
        purpose: `${input.purpose || "Donation"} (${input.intervalType})`,
        campaignId: input.campaignId || null,
      });

      return {
        subscriptionId: subscription.id,
        keyId: RAZORPAY_KEY_ID,
      };
    }),

  /**
   * Verify a successful Razorpay subscription payment, record the initial donation,
   * and complete the transaction.
   * Public procedure.
   */
  verifySubscription: publicProcedure
    .input(
      z.object({
        razorpaySubscriptionId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // 1. Verify Razorpay Subscription signature
      const expected = createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${input.razorpayPaymentId}|${input.razorpaySubscriptionId}`)
        .digest("hex");
      
      const expectedBuf = Buffer.from(expected, "utf-8");
      const signatureBuf = Buffer.from(input.razorpaySignature, "utf-8");

      let isValid = true;
      if (expectedBuf.length !== signatureBuf.length) {
        isValid = false;
      } else {
        isValid = timingSafeEqual(expectedBuf, signatureBuf);
      }

      if (!isValid) {
        // Mark subscription transaction as failed
        await db
          .update(paymentTransactions)
          .set({
            status: "failed",
            razorpayPaymentId: input.razorpayPaymentId,
            razorpaySignature: input.razorpaySignature,
            updatedAt: new Date(),
          })
          .where(eq(paymentTransactions.transactionId, input.razorpaySubscriptionId));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Subscription verification failed. Invalid signature.",
        });
      }

      // 2. Fetch the transaction record
      const [txn] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.transactionId, input.razorpaySubscriptionId))
        .limit(1);

      if (!txn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription transaction not found.",
        });
      }

      if (txn.status === "completed") {
        return {
          success: true,
          message: "Subscription already verified.",
          receiptNumber: txn.transactionId,
        };
      }

      // 3. Create the donation record
      const receiptNumber = `RCP-${nanoid(10).toUpperCase()}`;
      const donationAmount = parseFloat(txn.amount.toString());

      const [insertResult] = await db
        .insert(donations)
        .values({
          donorName: txn.donorName,
          donorEmail: txn.donorEmail,
          donorPhone: txn.donorPhone,
          amount: donationAmount.toString(),
          donationType: "online",
          paymentMethod: "razorpay_subscription",
          transactionId: input.razorpayPaymentId,
          paymentStatus: "completed",
          purpose: txn.purpose || "Monthly Donation",
          campaignId: txn.campaignId || undefined,
          receiptNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // 4. Update the payment transaction to link the donation
      await db
        .update(paymentTransactions)
        .set({
          status: "completed",
          donationId: insertResult.insertId,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.transactionId, input.razorpaySubscriptionId));

      return {
        success: true,
        receiptNumber,
      };
    }),

  /**
   * Delete a payment transaction record (admin only).
   */
  adminDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(paymentTransactions).where(eq(paymentTransactions.id, input.id));

      return { success: true, message: "Transaction record deleted successfully" };
    }),
});
