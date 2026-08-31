import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { excludePassword } from "../utils/auth";
import { hashPassword, verifyPassword } from "../auth";
import { encryptField, decryptField } from "../utils/encryption";

export const memberRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

    if (user.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const userData = user[0];
    if (userData.aadharNumber) {
      userData.aadharNumber = decryptField(userData.aadharNumber) || userData.aadharNumber;
    }

    return excludePassword(userData);
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
        bio: z.string().optional(),
        fatherName: z.string().optional(),
        dob: z.union([z.string(), z.date()]).optional().nullable(),
        aadharNumber: z.string().regex(/^\d{12}$/, "Aadhar number must be exactly 12 digits").optional().or(z.literal("")),
        gender: z.enum(["male", "female", "other"]).optional(),
        maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
        category: z.enum(["General", "OBC", "SC", "ST", "Other"]).optional(),
        bloodGroup: z.string().optional(),
        occupation: z.string().optional(),
        address: z.string().optional(),
        pinCode: z.string().regex(/^\d{6}$/, "Pin code must be exactly 6 digits").optional().or(z.literal("")),
        state: z.string().optional(),
        city: z.string().optional(),
        designation: z.string().optional(),
        profileImage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const encryptedAadhar = input.aadharNumber ? encryptField(input.aadharNumber) : undefined;

      // Safely format DOB to YYYY-MM-DD string format for MySQL DATE column
      let formattedDob: string | null = null;
      if (input.dob) {
        if (typeof input.dob === "string" && input.dob.trim() !== "") {
          formattedDob = input.dob.slice(0, 10);
        } else if (input.dob instanceof Date && !isNaN(input.dob.getTime())) {
          const yyyy = input.dob.getFullYear();
          const mm = String(input.dob.getMonth() + 1).padStart(2, '0');
          const dd = String(input.dob.getDate()).padStart(2, '0');
          formattedDob = `${yyyy}-${mm}-${dd}`;
        }

        if (formattedDob) {
          const dobDate = new Date(formattedDob);
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          if (dobDate > today) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Date of Birth cannot be in the future.",
            });
          }
        }
      }

      await db
        .update(users)
        .set({
          name: input.name,
          phone: input.phone,
          bio: input.bio,
          fatherName: input.fatherName,
          ...(input.dob !== undefined ? { dob: formattedDob as any } : {}),
          ...(input.aadharNumber !== undefined ? { aadharNumber: encryptedAadhar } : {}),
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
          profileImage: input.profileImage || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters long")
          .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
          .regex(/[a-z]/, "Password must contain at least one lowercase letter")
          .regex(/[0-9]/, "Password must contain at least one number"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch user with password
      const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (user.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const userData = user[0];
      
      // Verify current password
      const passwordMatch = await verifyPassword(input.currentPassword, userData.passwordHash || "");
      if (!passwordMatch) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect current password" });
      }

      // Hash and save new password & increment tokenGeneration to revoke old tokens
      const newHash = await hashPassword(input.newPassword);
      await db
        .update(users)
        .set({
          passwordHash: newHash,
          tokenGeneration: sql`${users.tokenGeneration} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true, message: "Password updated successfully. All other active sessions have been logged out." };
    }),
});
