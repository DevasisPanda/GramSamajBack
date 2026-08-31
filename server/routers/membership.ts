import { z } from "zod";
import { createHmac } from "crypto";
import { nanoid } from "nanoid";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { members, users, paymentTransactions } from "../../drizzle/schema";
import { eq, desc, like, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { paginationInput, generateMembershipNumber, escapeLikePattern } from "../_core/shared";
import { sendWhatsAppMessage } from "../services/whatsapp";
import { sendMembershipPaymentEmail, sendMembershipApprovalEmail } from "../services/email";
import { excludePassword } from "../utils/auth";


export const membershipRouter = router({
  // Apply for membership (public enrollment)
  applyMembership: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        email: z.string().email("Valid email required"),
        phone: z.string().optional().or(z.literal("")),
        aadharNumber: z.string().optional().or(z.literal("")),
        membershipType: z.enum(["regular", "lifetime"]).default("regular"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.transaction(async (tx) => {
        // Find or create user
        let userId: number;
        const existingUsers = await tx.select().from(users).where(eq(users.email, input.email)).limit(1);

        if (existingUsers.length > 0) {
          userId = existingUsers[0].id;
          await tx
            .update(users)
            .set({
              name: input.name,
              phone: input.phone || existingUsers[0].phone,
              aadharNumber: input.aadharNumber || existingUsers[0].aadharNumber,
              membershipType: input.membershipType,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
        } else {
          const [newUser] = await tx.insert(users).values({
            email: input.email,
            name: input.name,
            phone: input.phone || null,
            aadharNumber: input.aadharNumber || null,
            role: "user",
            status: "pending",
            membershipType: input.membershipType,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          });
          userId = newUser.insertId;
        }

        // Check if existing membership exists
        const existingMember = await tx.select().from(members).where(eq(members.userId, userId)).limit(1);
        if (existingMember.length > 0) {
          return { membershipNumber: existingMember[0].membershipNumber };
        }

        const membershipNumber = await generateMembershipNumber(tx);
        await tx.insert(members).values({
          userId,
          membershipNumber,
          membershipType: input.membershipType,
          status: "pending",
          joinDate: new Date(),
          renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { membershipNumber };
      });

      return { success: true, membershipNumber: result.membershipNumber };
    }),

  // Register new member (authenticated user)
  register: protectedProcedure
    .input(
      z.object({
        membershipType: z.enum(["regular", "lifetime"]).optional().default("regular"),
        referredBy: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.transaction(async (tx) => {
        const membershipNumber = await generateMembershipNumber(tx);

        let referredByUserId: number | undefined = undefined;
        if (input.referredBy) {
          // 1. Try finding by membershipNumber
          const refereeMember = await tx
            .select({ userId: members.userId })
            .from(members)
            .where(eq(members.membershipNumber, input.referredBy))
            .limit(1);

          if (refereeMember.length > 0) {
            referredByUserId = refereeMember[0].userId;
          } else {
            // 2. Try finding by referralCode
            const refereeByCode = await tx
              .select({ userId: members.userId })
              .from(members)
              .where(eq(members.referralCode, input.referredBy))
              .limit(1);

            if (refereeByCode.length > 0) {
              referredByUserId = refereeByCode[0].userId;
            } else {
              // 3. Try parsing as numeric userId directly
              const parsedId = parseInt(input.referredBy, 10);
              if (!isNaN(parsedId)) {
                const refereeUser = await tx
                  .select({ id: users.id })
                  .from(users)
                  .where(eq(users.id, parsedId))
                  .limit(1);
                if (refereeUser.length > 0) {
                  referredByUserId = refereeUser[0].id;
                }
              }
            }
          }
        }

        await tx.insert(members).values({
          userId: ctx.user.id,
          membershipNumber,
          membershipType: input.membershipType,
          status: "pending",
          joinDate: new Date(),
          renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          referredBy: referredByUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { membershipNumber };
      });

      return { success: true, membershipNumber: result.membershipNumber };
    }),

  // Get pending memberships (admin only, paginated)
  getPending: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select({
          id: members.id,
          userId: members.userId,
          membershipNumber: members.membershipNumber,
          membershipType: members.membershipType,
          status: members.status,
          joinDate: members.joinDate,
          renewalDate: members.renewalDate,
          expiryDate: members.expiryDate,
          referralCode: members.referralCode,
          referredBy: members.referredBy,
          createdAt: members.createdAt,
          updatedAt: members.updatedAt,
          paymentStatus: members.paymentStatus,
          paymentTxnId: members.paymentTxnId,
          amountPaid: members.amountPaid,
          paymentType: members.paymentType,
          name: users.name,
          email: users.email,
          phone: users.phone,
          profileImage: users.profileImage,
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .where(eq(members.status, "pending"))
        .orderBy(desc(members.createdAt))
        .limit(input.pageSize)
        .offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.status, "pending"));
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Get active memberships (paginated)
  getActive: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(members)
        .where(eq(members.status, "active"))
        .orderBy(desc(members.joinDate))
        .limit(input.pageSize)
        .offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.status, "active"));
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Get active memberships with full user details (paginated)
  getActiveWithDetails: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select({
          id: members.id,
          userId: members.userId,
          membershipNumber: members.membershipNumber,
          membershipType: members.membershipType,
          status: members.status,
          joinDate: members.joinDate,
          renewalDate: members.renewalDate,
          expiryDate: members.expiryDate,
          paymentStatus: members.paymentStatus,
          paymentTxnId: members.paymentTxnId,
          amountPaid: members.amountPaid,
          paymentType: members.paymentType,
          name: users.name,
          email: users.email,
          phone: users.phone,
          profileImage: users.profileImage,
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .where(eq(members.status, "active"))
        .orderBy(desc(members.joinDate))
        .limit(input.pageSize)
        .offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.status, "active"));
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Get active public members (paginated)
  getPublicMembers: publicProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select({
          id: members.id,
          membershipNumber: members.membershipNumber,
          joinDate: members.joinDate,
          name: users.name,
          designation: users.designation,
          profileImage: users.profileImage,
        })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(
          and(
            eq(members.status, "active"),
            eq(users.status, "active")
          )
        )
        .orderBy(desc(members.joinDate))
        .limit(input.pageSize)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(
          and(
            eq(members.status, "active"),
            eq(users.status, "active")
          )
        );
      
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Get my membership
  getMyMembership: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const result = await db
      .select({
        id: members.id,
        userId: members.userId,
        membershipNumber: members.membershipNumber,
        membershipType: members.membershipType,
        status: members.status,
        joinDate: members.joinDate,
        renewalDate: members.renewalDate,
        expiryDate: members.expiryDate,
        paymentStatus: members.paymentStatus,
        paymentTxnId: members.paymentTxnId,
        amountPaid: members.amountPaid,
        paymentType: members.paymentType,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          designation: users.designation,
          role: users.role,
          profileImage: users.profileImage,
          aadharNumber: users.aadharNumber,
        },
      })
      .from(members)
      .leftJoin(users, eq(members.userId, users.id))
      .where(eq(members.userId, ctx.user.id))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }),

  // Create Razorpay order for membership payment
  createMembershipOrder: protectedProcedure
    .input(
      z.object({
        membershipType: z.enum(["regular", "lifetime"]),
        amount: z.number().min(1),
        userName: z.string(),
        userEmail: z.string(),
        userPhone: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { getRazorpay } = await import("./payment");
      const razorpay = await getRazorpay();

      // Enforce strict server-side membership pricing (₹5100 for lifetime, ₹500 for yearly)
      const finalAmount = input.membershipType === "lifetime" ? 5100 : 500;

      const receipt = `MEM-${nanoid(8).toUpperCase()}`;
      const razorpayOrder = await razorpay.orders.create({
        amount: finalAmount * 100, // paise
        currency: "INR",
        receipt,
        notes: {
          purpose: "membership_fee",
          membershipType: input.membershipType,
          userId: String(ctx.user.id),
          userName: input.userName,
          userEmail: input.userEmail,
          userPhone: input.userPhone,
        },
      });

      await db.insert(paymentTransactions).values({
        transactionId: razorpayOrder.id,
        amount: finalAmount.toString(),
        status: "initiated",
        paymentMethod: "razorpay",
        razorpayOrderId: razorpayOrder.id,
        donorName: input.userName,
        donorEmail: input.userEmail,
        donorPhone: input.userPhone,
        purpose: `Membership Fee (${input.membershipType})`,
      });

      return {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // in paise
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID || "",
        receipt,
      };
    }),

  // Verify Razorpay payment and set paymentStatus='paid' + status='pending'
  verifyMembershipPayment: protectedProcedure
    .input(
      z.object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        membershipType: z.enum(["regular", "lifetime"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const secret = process.env.RAZORPAY_KEY_SECRET || "";
      const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
      const expectedSignature = createHmac("sha256", secret).update(body).digest("hex");

      if (expectedSignature !== input.razorpaySignature) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment signature" });
      }

      // Update payment transactions
      await db
        .update(paymentTransactions)
        .set({ status: "completed", razorpayPaymentId: input.razorpayPaymentId, updatedAt: new Date() })
        .where(eq(paymentTransactions.razorpayOrderId, input.razorpayOrderId));

      // Calculate payment amount securely based on membershipType
      const finalAmount = input.membershipType === "lifetime" ? 5100 : 500;

      // Find or create member record
      const existingMember = await db.select().from(members).where(eq(members.userId, ctx.user.id)).limit(1);

      if (existingMember.length > 0) {
        await db
          .update(members)
          .set({
            membershipType: input.membershipType,
            paymentStatus: "paid",
            paymentTxnId: input.razorpayPaymentId,
            amountPaid: String(finalAmount),
            paymentType: input.membershipType === "lifetime" ? "lifetime_one_time" : "yearly_subscription",
            status: "pending", // Waiting 24h admin approval
            updatedAt: new Date(),
          })
          .where(eq(members.id, existingMember[0].id));
      } else {
        const membershipNumber = await generateMembershipNumber(db);
        await db.insert(members).values({
          userId: ctx.user.id,
          membershipNumber,
          membershipType: input.membershipType,
          paymentStatus: "paid",
          paymentTxnId: input.razorpayPaymentId,
          amountPaid: String(finalAmount),
          paymentType: input.membershipType === "lifetime" ? "lifetime_one_time" : "yearly_subscription",
          status: "pending",
          joinDate: new Date(),
          renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Dispatch Membership Payment Confirmation Email (non-blocking)
      const memberUser = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (memberUser.length > 0 && memberUser[0].email) {
        const emailData = {
          memberName: memberUser[0].name || "Member",
          memberEmail: memberUser[0].email,
          memberPhone: memberUser[0].phone || undefined,
          membershipType: input.membershipType,
          amount: finalAmount,
          transactionId: input.razorpayPaymentId,
          membershipNumber: existingMember[0]?.membershipNumber || undefined,
        };
        setImmediate(() => {
          sendMembershipPaymentEmail(emailData).catch((e) => console.error("[Membership] Payment email delivery failed:", e));
        });
      }

      return { success: true, message: "Payment verified! Your application is under 24h review." };
    }),

  // Upgrade to lifetime (admin only)
  upgradeToLifetime: adminProcedure
    .input(z.object({ membershipId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(members)
        .set({
          membershipType: "lifetime",
          paymentStatus: "exempted",
          paymentType: "admin_exempted",
          renewalDate: null,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(members.id, input.membershipId));

      return { success: true };
    }),

  // Approve membership (admin only)
  approve: adminProcedure
    .input(z.object({ membershipId: z.number(), isExempted: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const memberRow = await db.select().from(members).where(eq(members.id, input.membershipId)).limit(1);
      if (memberRow.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

      const updates: Record<string, any> = { 
        status: "active", 
        updatedAt: new Date() 
      };

      if (input.isExempted || memberRow[0].paymentStatus === "unpaid") {
        updates.paymentStatus = "exempted";
        updates.paymentType = "admin_exempted";
        updates.amountPaid = "0";
      }

      const memberDetails = await db
        .select({
          name: users.name,
          email: users.email,
          phone: users.phone,
          membershipNumber: members.membershipNumber
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .where(eq(members.id, input.membershipId))
        .limit(1);

      await db
        .update(members)
        .set(updates)
        .where(eq(members.id, input.membershipId));

      if (memberDetails.length > 0) {
        // 1. Send WhatsApp Notification
        if (memberDetails[0].phone) {
          const approvedMessage = `Hello ${memberDetails[0].name},\n\n` +
            `Your membership request for *Appropriate Institute of Rural Development (AIRD Trust)* has been approved!\n\n` +
            `• *Membership No:* ${memberDetails[0].membershipNumber}\n\n` +
            `You can now access your member services and participate in Gram Swaraj initiatives.\n\n` +
            `Website: ${process.env.FRONTEND_URL || 'https://airdup.com'}`;

          sendWhatsAppMessage(memberDetails[0].phone, "Membership Approved", approvedMessage)
            .catch(err => {
              console.error("[WhatsApp] Approval notification failed:", err);
            });
        }

        // 2. Send Approval Email
        if (memberDetails[0].email) {
          const emailData = {
            memberName: memberDetails[0].name || "Member",
            memberEmail: memberDetails[0].email,
            membershipNumber: memberDetails[0].membershipNumber || "",
            membershipType: memberRow[0]?.membershipType || "regular",
          };
          setImmediate(() => {
            sendMembershipApprovalEmail(emailData).catch((e) => console.error("[Membership] Approval email delivery failed:", e));
          });
        }
      }

      return { success: true };
    }),

  // Reject membership (admin only)
  reject: adminProcedure
    .input(z.object({ membershipId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(members)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(members.id, input.membershipId));

      return { success: true };
    }),

  // Renew membership by user
  renew: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const membership = await db
      .select()
      .from(members)
      .where(eq(members.userId, ctx.user.id))
      .limit(1);

    if (membership.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });
    }

    const newRenewalDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await db
      .update(members)
      .set({ renewalDate: newRenewalDate, expiryDate: newRenewalDate, updatedAt: new Date() })
      .where(eq(members.id, membership[0].id));

    return { success: true, renewalDate: newRenewalDate };
  }),

  // Renew member by admin (extends renewalDate by 365 days)
  renewByAdmin: adminProcedure
    .input(z.object({ membershipId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const memberRow = await db.select().from(members).where(eq(members.id, input.membershipId)).limit(1);
      if (memberRow.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

      const currentExpiry = memberRow[0].renewalDate || memberRow[0].expiryDate || new Date();
      const baseDate = new Date(currentExpiry).getTime() > Date.now() ? new Date(currentExpiry) : new Date();
      const newRenewalDate = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);

      await db
        .update(members)
        .set({ 
          renewalDate: newRenewalDate, 
          expiryDate: newRenewalDate,
          status: "active",
          paymentStatus: "paid",
          updatedAt: new Date() 
        })
        .where(eq(members.id, input.membershipId));

      return { success: true, renewalDate: newRenewalDate };
    }),

  // Get all memberships (admin only, paginated)
  adminGetAll: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const items = await db.select().from(members).orderBy(desc(members.createdAt)).limit(input.pageSize).offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(members);
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Search memberships (admin only, paginated)
  search: adminProcedure
    .input(z.object({ query: z.string(), page: z.number().min(1).default(1), pageSize: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      // Search by membership number
      const escapedQuery = escapeLikePattern(input.query);
      const items = await db
        .select()
        .from(members)
        .where(like(members.membershipNumber, `%${escapedQuery}%`))
        .limit(input.pageSize)
        .offset(offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(members).where(like(members.membershipNumber, `%${escapedQuery}%`));
      const total = countResult?.count ?? 0;

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Delete membership (admin only)
  delete: adminProcedure
    .input(z.object({ membershipId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(members).where(eq(members.id, input.membershipId));

      return { success: true };
    }),

  // Get single member details
  getMemberDetails: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Security Check: Only allow admin or the user themselves to view full details
      if (ctx.user.role !== "admin" && ctx.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view these details" });
      }

      const result = await db
        .select({
          id: members.id,
          userId: members.userId,
          membershipNumber: members.membershipNumber,
          membershipType: members.membershipType,
          status: members.status,
          joinDate: members.joinDate,
          renewalDate: members.renewalDate,
          paymentStatus: members.paymentStatus,
          paymentTxnId: members.paymentTxnId,
          amountPaid: members.amountPaid,
          paymentType: members.paymentType,
          user: {
            name: users.name,
            email: users.email,
            phone: users.phone,
            fatherName: users.fatherName,
            dob: users.dob,
            aadharNumber: users.aadharNumber,
            gender: users.gender,
            maritalStatus: users.maritalStatus,
            category: users.category,
            bloodGroup: users.bloodGroup,
            occupation: users.occupation,
            address: users.address,
            pinCode: users.pinCode,
            state: users.state,
            city: users.city,
            designation: users.designation,
            role: users.role,
            isSystemAdmin: users.isSystemAdmin,
            profileImage: users.profileImage,
          }
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .where(eq(members.userId, input.userId))
        .limit(1);

      if (result.length === 0) {
        const userOnly = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (userOnly.length > 0) {
          return {
            id: 0,
            userId: userOnly[0].id,
            membershipNumber: "N/A",
            membershipType: userOnly[0].membershipType || "N/A",
            status: userOnly[0].status,
            joinDate: userOnly[0].createdAt,
            renewalDate: null,
            paymentStatus: "unpaid" as const,
            paymentTxnId: null,
            amountPaid: null,
            paymentType: null,
            user: excludePassword(userOnly[0])
          };
        }
      }

      if (result.length > 0 && result[0].user) {
        return result[0];
      }

      return null;
    }),
});
