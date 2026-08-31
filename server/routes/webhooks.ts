import { Router, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "../db";
import { donations, paymentTransactions, members, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateMembershipNumber } from "../_core/shared";
import { deliverReceiptViaWhatsApp, deliverReceiptViaEmail } from "../services/receipt";
import { sendMembershipPaymentEmail } from "../services/email";

export const razorpayWebhookRouter = Router();

interface WebhookRequest extends Request {
  rawBody?: string;
}

razorpayWebhookRouter.post("/", async (req: WebhookRequest, res: Response): Promise<any> => {
  const signature = req.headers["x-razorpay-signature"];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.warn("[Webhook] Rejected: Missing signature header or RAZORPAY_WEBHOOK_SECRET environment variable");
    return res.status(400).send("Signature validation failed");
  }

  const rawBody = req.rawBody || "";

  // 1. Verify Razorpay HMAC SHA-256 Webhook Signature
  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const sigString = Array.isArray(signature) ? signature[0] : signature;
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(sigString || "", "utf8");

  if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) {
    console.warn("[Webhook] Rejected: Signature mismatch");
    return res.status(400).send("Signature validation failed");
  }

  const db = await getDb();
  if (!db) {
    console.error("[Webhook] Failed: Database connection unavailable");
    return res.status(500).send("Database unavailable");
  }

  const event = req.body;
  const eventName = event.event;

  console.log(`[Webhook] Received Razorpay event: ${eventName}`);

  try {
    // EVENT 1 & 2: Successful One-Time Payment / Order Paid (Membership or Donation)
    if (eventName === "payment.captured" || eventName === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const amountInRupees = paymentEntity?.amount ? paymentEntity.amount / 100 : 0;
      const notes = { ...(orderEntity?.notes || {}), ...(paymentEntity?.notes || {}) };

      if (paymentId && orderId) {
        // Update payment_transactions status
        await db
          .update(paymentTransactions)
          .set({ status: "completed", razorpayPaymentId: paymentId, updatedAt: new Date() })
          .where(eq(paymentTransactions.razorpayOrderId, orderId));

        // Check if this is a Membership Fee Payment
        const isMembership = notes.purpose === "membership_fee" || notes.userId || notes.membershipType;

        if (isMembership) {
          const userId = notes.userId ? parseInt(notes.userId, 10) : null;
          const membershipType = (notes.membershipType as "regular" | "lifetime") || (amountInRupees >= 5000 ? "lifetime" : "regular");

          if (userId) {
            const existingMember = await db.select().from(members).where(eq(members.userId, userId)).limit(1);

            if (existingMember.length > 0) {
              await db
                .update(members)
                .set({
                  membershipType,
                  paymentStatus: "paid",
                  paymentTxnId: paymentId,
                  amountPaid: String(amountInRupees),
                  paymentType: membershipType === "lifetime" ? "lifetime_one_time" : "yearly_subscription",
                  status: "pending", // Waiting 24h admin approval
                  renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                  updatedAt: new Date(),
                })
                .where(eq(members.id, existingMember[0].id));
            } else {
              const membershipNumber = await generateMembershipNumber(db);
              await db.insert(members).values({
                userId,
                membershipNumber,
                membershipType,
                paymentStatus: "paid",
                paymentTxnId: paymentId,
                amountPaid: String(amountInRupees),
                paymentType: membershipType === "lifetime" ? "lifetime_one_time" : "yearly_subscription",
                status: "pending",
                joinDate: new Date(),
                renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            // Dispatch membership confirmation email (non-blocking)
            const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            if (userRow && userRow.email) {
              const emailData = {
                memberName: userRow.name || notes.userName || "Member",
                memberEmail: userRow.email,
                memberPhone: userRow.phone || notes.userPhone || undefined,
                membershipType,
                amount: amountInRupees,
                transactionId: paymentId,
                membershipNumber: existingMember[0]?.membershipNumber || undefined,
              };
              setImmediate(() => {
                sendMembershipPaymentEmail(emailData).catch((e) => console.error("[Webhook] Membership email delivery failed:", e));
              });
            }

            console.log(`[Webhook] Membership payment processed via webhook for user ${userId}: Payment ID ${paymentId}, Amount ₹${amountInRupees}`);
          }
        } else {
          // Standard Donation Webhook Processing
          const [existingDonation] = await db
            .select()
            .from(donations)
            .where(eq(donations.transactionId, paymentId))
            .limit(1);

          if (!existingDonation) {
            // Retrieve donorId from paymentTransactions if available
            const [txn] = await db
              .select()
              .from(paymentTransactions)
              .where(eq(paymentTransactions.razorpayOrderId, orderId))
              .limit(1);

            const receiptNumber = `RCP-${nanoid(10).toUpperCase()}`;
            await db.insert(donations).values({
              donorId: txn?.donorId || null,
              donorName: notes.donorName || paymentEntity?.notes?.donorName || txn?.donorName || "Anonymous Donor",
              donorEmail: notes.donorEmail || paymentEntity?.email || txn?.donorEmail || "",
              donorPhone: notes.donorPhone || paymentEntity?.contact || txn?.donorPhone || "",
              amount: String(amountInRupees),
              donationType: "online",
              paymentMethod: "razorpay",
              transactionId: paymentId,
              paymentStatus: "completed",
              purpose: notes.purpose || txn?.purpose || "General Donation",
              receiptNumber,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log(`[Webhook] Standard donation payment recorded via webhook: Payment ID ${paymentId}, Receipt ${receiptNumber}`);

            // Fire-and-forget delivery
            const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:5000";
            const pdfUrl = `${apiBaseUrl}/api/receipts/download/${receiptNumber}.pdf`;
            const receiptData = {
              donationId: 0,
              receiptNumber,
              donorName: notes.donorName || paymentEntity?.notes?.donorName || "Anonymous Donor",
              donorEmail: notes.donorEmail || paymentEntity?.email || "",
              donorPhone: notes.donorPhone || paymentEntity?.contact || "",
              amount: String(amountInRupees),
              purpose: notes.purpose || "General Donation",
              paymentMethod: "razorpay",
              transactionId: paymentId,
              createdAt: new Date(),
            };
            setImmediate(() => {
              deliverReceiptViaWhatsApp(receiptData, pdfUrl).catch((e) => console.error("[Webhook] WhatsApp delivery failed:", e));
              deliverReceiptViaEmail(receiptData, pdfUrl).catch((e) => console.error("[Webhook] Email delivery failed:", e));
            });
          }
        }
      }
    }

    // EVENT 3: Failed Payment Event
    else if (eventName === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const errorDesc = paymentEntity?.error_description || "Payment failed";

      if (orderId) {
        await db
          .update(paymentTransactions)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(paymentTransactions.razorpayOrderId, orderId));

        console.log(`[Webhook] Recorded failed payment via webhook for order ${orderId}: ${errorDesc}`);
      }
    }

    // EVENT 4: Recurring Subscription Charged (Yearly Membership Renewal or Monthly Donation)
    else if (eventName === "subscription.charged") {
      const paymentEntity = event.payload?.payment?.entity;
      const subscriptionEntity = event.payload?.subscription?.entity;
      const paymentId = paymentEntity?.id;
      const amountInRupees = paymentEntity?.amount ? paymentEntity.amount / 100 : 0;
      const notes = { ...(subscriptionEntity?.notes || {}), ...(paymentEntity?.notes || {}) };

      if (paymentId) {
        if (notes.purpose === "membership_fee" || notes.userId) {
          const userId = notes.userId ? parseInt(notes.userId, 10) : null;
          if (userId) {
            await db
              .update(members)
              .set({
                paymentStatus: "paid",
                paymentTxnId: paymentId,
                amountPaid: String(amountInRupees),
                renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
              })
              .where(eq(members.userId, userId));
            console.log(`[Webhook] Recurring subscription renewal processed via webhook for user ${userId}: Payment ID ${paymentId}`);
          }
        } else {
          // Monthly recurring donation charge
          const [existingDonation] = await db
            .select()
            .from(donations)
            .where(eq(donations.transactionId, paymentId))
            .limit(1);

          if (!existingDonation) {
            const receiptNumber = `RCP-${nanoid(10).toUpperCase()}`;
            await db.insert(donations).values({
              donorName: notes.donorName || paymentEntity?.notes?.donorName || "Anonymous Donor",
              donorEmail: paymentEntity?.email || "",
              donorPhone: paymentEntity?.contact || "",
              amount: String(amountInRupees),
              donationType: "online",
              paymentMethod: "razorpay_subscription",
              transactionId: paymentId,
              paymentStatus: "completed",
              purpose: notes.purpose || "Monthly Donation Renewal",
              receiptNumber,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log(`[Webhook] Recorded subscription charge via webhook: Payment ID ${paymentId}, Receipt ${receiptNumber}`);

            // Fire-and-forget delivery
            const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:5000";
            const pdfUrl = `${apiBaseUrl}/api/receipts/download/${receiptNumber}.pdf`;
            const receiptData = {
              donationId: 0,
              receiptNumber,
              donorName: notes.donorName || paymentEntity?.notes?.donorName || "Anonymous Donor",
              donorEmail: paymentEntity?.email || "",
              donorPhone: paymentEntity?.contact || "",
              amount: String(amountInRupees),
              purpose: notes.purpose || "Monthly Donation Renewal",
              paymentMethod: "razorpay_subscription",
              transactionId: paymentId,
              createdAt: new Date(),
            };
            setImmediate(() => {
              deliverReceiptViaWhatsApp(receiptData, pdfUrl).catch((e) => console.error("[Webhook] WhatsApp delivery failed:", e));
              deliverReceiptViaEmail(receiptData, pdfUrl).catch((e) => console.error("[Webhook] Email delivery failed:", e));
            });
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Webhook] Processing Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
