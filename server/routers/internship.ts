import { z } from "zod";
import { publicProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { internships, internshipApplications } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const internshipRouter = router({
  // Get all internships (for public)
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return db
      .select()
      .from(internships)
      .where(eq(internships.status, "open"))
      .orderBy(desc(internships.createdAt));
  }),

  // Get single internship
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.select().from(internships).where(eq(internships.id, input.id)).limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  // Apply for internship
  submitApplication: publicProcedure
    .input(
      z.object({
        internshipId: z.number(),
        applicantName: z.string().min(2),
        applicantEmail: z.string().email(),
        applicantPhone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
        educationBackground: z.string().optional(),
        coverLetter: z.string().min(10),
        resumeUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if internship exists and is open
      const internship = await db
        .select()
        .from(internships)
        .where(eq(internships.id, input.internshipId))
        .limit(1);

      if (internship.length === 0 || internship[0].status !== "open") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Internship is not available" });
      }

      await db.insert(internshipApplications).values({
        internshipId: input.internshipId,
        userId: ctx.user?.id, // Optional depending on login status
        applicantName: input.applicantName,
        applicantEmail: input.applicantEmail,
        applicantPhone: input.applicantPhone,
        educationBackground: input.educationBackground,
        coverLetter: input.coverLetter,
        resumeUrl: input.resumeUrl,
        status: "pending",
        appliedAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, message: "Application submitted successfully" };
    }),

  // --- Admin Routes below ---

  // Get all internships (including closed/drafts)
  adminGetAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return db.select().from(internships).orderBy(desc(internships.createdAt));
  }),

  // Create internship
  create: adminProcedure
    .input(
      z.object({
        title: z.string(),
        department: z.string().optional(),
        description: z.string(),
        requirements: z.string().optional(),
        duration: z.string().optional(),
        location: z.string().optional(),
        type: z.enum(["remote", "onsite", "hybrid"]).default("remote"),
        status: z.enum(["open", "closed", "draft"]).default("open"),
        applicationDeadline: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(internships).values({
        title: input.title,
        department: input.department,
        description: input.description,
        requirements: input.requirements,
        duration: input.duration,
        location: input.location,
        type: input.type,
        status: input.status,
        image: input.image || null,
        applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true };
    }),

  // Update status
  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["open", "closed", "draft"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(internships).set({ status: input.status, updatedAt: new Date() }).where(eq(internships.id, input.id));
      return { success: true };
    }),

  // Get applications for a specific internship
  getApplications: adminProcedure
    .input(z.object({ internshipId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      return db
        .select()
        .from(internshipApplications)
        .where(eq(internshipApplications.internshipId, input.internshipId))
        .orderBy(desc(internshipApplications.appliedAt));
    }),

  // Update application status
  updateApplicationStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pending", "reviewed", "interviewing", "accepted", "rejected"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(internshipApplications).set({ status: input.status, updatedAt: new Date() }).where(eq(internshipApplications.id, input.id));
      return { success: true };
    }),

  // Delete internship
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(internships).where(eq(internships.id, input.id));
      return { success: true };
    }),

  // Delete application
  deleteApplication: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(internshipApplications).where(eq(internshipApplications.id, input.id));
      return { success: true };
    }),
});
