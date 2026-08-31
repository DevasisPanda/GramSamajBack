import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { hashPassword } from "../auth";
import { users, members } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { excludePassword } from "../utils/auth";
import { generateMembershipNumber, paginationInput } from "../_core/shared";
import { logAuditEvent } from "../utils/audit";
import { sendWhatsAppMessage } from "../services/whatsapp";
export const adminRouter = router({
  // Create user with membership (uses transaction to fix race condition)
  createUser: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email(),
        phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters long")
          .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
          .regex(/[a-z]/, "Password must contain at least one lowercase letter")
          .regex(/[0-9]/, "Password must contain at least one number"),
        membershipType: z.enum(["regular", "lifetime"]),
        profileImage: z.string().optional(),
        isSystemAdmin: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      if (input.isSystemAdmin && !ctx.user.isSystemAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only System Admins can create another System Admin." });
      }

      // Check if email exists
      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existingUser.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }

      const passwordHash = await hashPassword(input.password);

      // Use transaction to prevent membership number race condition
      const result = await db.transaction(async (tx) => {
        // Insert user
        const [insertResult] = await tx.insert(users).values({
          email: input.email,
          name: input.name,
          phone: input.phone,
          passwordHash,
          role: "user",
          status: "active",
          membershipType: input.membershipType,
          profileImage: input.profileImage || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        });

        const newUserId = insertResult.insertId;

        const membershipNumber = await generateMembershipNumber(tx);

        // Insert member
        await tx.insert(members).values({
          userId: newUserId,
          membershipNumber,
          membershipType: input.membershipType,
          status: "active",
          joinDate: new Date(),
          renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { userId: newUserId, membershipNumber };
      });

      await logAuditEvent(db, ctx.user.id, "CREATE_USER", "users", result.userId, { email: input.email, name: input.name }, ctx.req.ip);

      if (input.phone) {
        const welcomeMessage = `Hello ${input.name},\n\n` +
          `You have been successfully registered as a member of *Appropriate Institute of Rural Development (AIRD Trust)*.\n\n` +
          `*Your Login Credentials:*\n` +
          `• *Membership No:* ${result.membershipNumber}\n` +
          `• *Email:* ${input.email}\n` +
          `• *Temporary Password:* ${input.password}\n\n` +
          `Please log in to your dashboard to view your profile, download your digital ID card and certificates.\n\n` +
          `Link: ${process.env.FRONTEND_URL || "https://airdup.com"}/admin/login`;

        sendWhatsAppMessage(input.phone, "Welcome to AIRD Trust", welcomeMessage)
          .catch(err => {
            console.error("[WhatsApp] Welcome notification failed for user:", result.userId, err);
          });
      }

      return { success: true, ...result };
    }),

  // Get all users (paginated)
  getAllUsers: adminProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const offset = (input.page - 1) * input.pageSize;
      const rows = await db
        .select({
          user: users,
          memberId: members.id,
          membershipNumber: members.membershipNumber,
          membershipStatus: members.status,
          paymentStatus: members.paymentStatus,
          amountPaid: members.amountPaid,
          paymentTxnId: members.paymentTxnId,
        })
        .from(users)
        .leftJoin(members, eq(users.id, members.userId))
        .orderBy(desc(users.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const total = countResult?.count ?? 0;

      const items = rows.map((row) => ({
        ...excludePassword(row.user),
        memberId: row.memberId || null,
        membershipNumber: row.membershipNumber || null,
        membershipStatus: row.membershipStatus || null,
        paymentStatus: row.paymentStatus || null,
        amountPaid: row.amountPaid || null,
        paymentTxnId: row.paymentTxnId || null,
      }));

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Approve user
  approveUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(users).set({ status: "active" }).where(eq(users.id, input.userId));
      await logAuditEvent(db, ctx.user.id, "APPROVE_USER", "users", input.userId, null, ctx.req.ip);

      return { success: true };
    }),
  // Block user
  blockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      if (targetUser[0].isSystemAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Primary system admin account is absolute and cannot be blocked." });
      }

      if (targetUser[0].role === "admin" && !ctx.user.isSystemAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only System Admins can block an administrator." });
      }

      await db.update(users).set({ 
        status: "blocked",
        tokenGeneration: (targetUser[0].tokenGeneration || 0) + 1,
        updatedAt: new Date(),
      }).where(eq(users.id, input.userId));
      await logAuditEvent(db, ctx.user.id, "BLOCK_USER", "users", input.userId, null, ctx.req.ip);

      return { success: true };
    }),

  // Unblock user
  unblockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(users).set({ status: "active", updatedAt: new Date() }).where(eq(users.id, input.userId));
      await logAuditEvent(db, ctx.user.id, "UNBLOCK_USER", "users", input.userId, null, ctx.req.ip);

      return { success: true };
    }),

  // Delete user
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      if (targetUser[0].isSystemAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Primary system admin account cannot be deleted." });
      }

      if (targetUser[0].role === "admin" && !ctx.user.isSystemAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only System Admins can delete an administrator." });
      }

      await db.delete(users).where(eq(users.id, input.userId));
      await logAuditEvent(db, ctx.user.id, "DELETE_USER", "users", input.userId, null, ctx.req.ip);

      return { success: true };
    }),

  // Promote to admin
  promoteToAdmin: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(users).set({ role: "admin", updatedAt: new Date() }).where(eq(users.id, input.userId));
      await logAuditEvent(db, ctx.user.id, "PROMOTE_ADMIN", "users", input.userId, null, ctx.req.ip);

      return { success: true };
    }),

  // Update user details (admin only)
  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")).nullable(),
        role: z.enum(["user", "admin", "staff", "volunteer"]).optional(),
        status: z.enum(["active", "inactive", "blocked", "pending"]).optional(),
        fatherName: z.string().optional().nullable(),
        dob: z.union([z.date(), z.string(), z.null()]).optional().transform(val => val ? new Date(val) : null),
        aadharNumber: z.string().optional().nullable(),
        gender: z.enum(["male", "female", "other"]).optional().nullable(),
        maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional().nullable(),
        category: z.enum(["General", "OBC", "SC", "ST", "Other"]).optional().nullable(),
        bloodGroup: z.string().optional().nullable(),
        occupation: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        pinCode: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        designation: z.string().optional().nullable(),
        profileImage: z.string().optional().nullable(),
        isSystemAdmin: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      if (targetUser[0].isSystemAdmin) {
        if (input.role && input.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Primary system admin role is absolute and cannot be demoted." });
        }
        if (input.status && input.status !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Primary system admin status must remain active." });
        }
      }

      if (input.isSystemAdmin !== undefined && input.isSystemAdmin !== targetUser[0].isSystemAdmin && !ctx.user.isSystemAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only a System Admin can modify System Admin privileges." });
      }

      if (input.email && input.email !== targetUser[0].email) {
        const emailExists = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (emailExists.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
        }
      }

      const updatePayload: Record<string, any> = {
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        status: input.status,
        fatherName: input.fatherName,
        dob: input.dob,
        aadharNumber: input.aadharNumber,
        gender: input.gender,
        maritalStatus: input.maritalStatus,
        category: input.category,
        bloodGroup: input.bloodGroup,
        occupation: input.occupation,
        address: input.address,
        pinCode: input.pinCode,
        state: input.state,
        city: input.city,
        designation: input.designation,
        profileImage: input.profileImage,
        updatedAt: new Date(),
      };

      if (input.isSystemAdmin !== undefined && ctx.user.isSystemAdmin) {
        updatePayload.isSystemAdmin = input.isSystemAdmin;
      }

      await db
        .update(users)
        .set(updatePayload)
        .where(eq(users.id, input.userId));

      await logAuditEvent(db, ctx.user.id, "UPDATE_USER", "users", input.userId, { name: input.name, email: input.email, role: input.role, status: input.status }, ctx.req.ip);

      return { success: true };
    }),

  resetUserPassword: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        newPassword: z.string().min(6, "Password must be at least 6 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      // Enforce authority check
      if (targetUser[0].role === "admin" && !ctx.user.isSystemAdmin && targetUser[0].id !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only System Admins can reset another administrator's password." });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db
        .update(users)
        .set({
          passwordHash,
          tokenGeneration: (targetUser[0].tokenGeneration || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      await logAuditEvent(db, ctx.user.id, "RESET_PASSWORD", "users", input.userId, null, ctx.req.ip);

      return { success: true, message: "User password reset successfully" };
    }),

  // Get high-level Dashboard Stats
  getDashboardStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [memberCount] = await db.select({ count: sql<number>`count(*)` }).from(members);
    const [donationSum] = await db.select({
      total: sql<string>`coalesce(sum(cast(amount as decimal(12,2))), 0)`,
      count: sql<number>`count(*)`
    }).from(sql`donations`);

    return {
      totalUsers: userCount?.count ?? 0,
      totalMembers: memberCount?.count ?? 0,
      totalDonations: parseFloat(donationSum?.total || "0"),
      donationCount: donationSum?.count ?? 0,
    };
  }),
});
