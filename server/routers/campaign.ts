import { z } from "zod";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { campaigns, donations, campaignVolunteers, users } from "../../drizzle/schema";
import { eq, desc, lte, and, gt, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const campaignRouter = router({
  // Create campaign (admin only)
  create: adminProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        goalAmount: z.number().min(0),
        startDate: z.date(),
        endDate: z.date(),
        category: z.string().optional(),
        campaignType: z.enum(["donation", "volunteer"]).default("donation"),
        whyNeeded: z.string().optional(),
        forWhom: z.string().optional(),
        impact: z.string().optional(),
        targetVolunteers: z.number().optional(),
        campaignImage: z.string().optional(),
        projectId: z.number().optional(),
        presetTiers: z.array(z.object({
          id: z.string(),
          label: z.string(),
          amount: z.number(),
          description: z.string().optional()
        })).max(3).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const campaignCode = `CAM-${nanoid(8).toUpperCase()}`;

      await db.insert(campaigns).values({
        title: input.title,
        description: input.description || null,
        campaignType: input.campaignType,
        whyNeeded: input.whyNeeded || null,
        forWhom: input.forWhom || null,
        impact: input.impact || null,
        goalAmount: input.goalAmount.toString(),
        targetVolunteers: input.targetVolunteers || null,
        raisedAmount: "0",
        campaignImage: input.campaignImage || null,
        projectId: input.projectId || null,
        presetTiers: input.presetTiers || null,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "active",
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, campaignCode };
    }),

  // Get all campaigns
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        description: campaigns.description,
        whyNeeded: campaigns.whyNeeded,
        forWhom: campaigns.forWhom,
        impact: campaigns.impact,
        campaignType: campaigns.campaignType,
        goalAmount: campaigns.goalAmount,
        targetVolunteers: campaigns.targetVolunteers,
        raisedAmount: campaigns.raisedAmount,
        campaignImage: campaigns.campaignImage,
        projectId: campaigns.projectId,
        presetTiers: campaigns.presetTiers,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        status: campaigns.status,
        createdBy: campaigns.createdBy,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
        volunteerCount: sql<number>`(select count(*) from ${campaignVolunteers} where ${campaignVolunteers.campaignId} = ${campaigns.id})`
      })
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt));
  }),

  // Get active campaigns
  getActive: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const now = new Date();
    return db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        description: campaigns.description,
        whyNeeded: campaigns.whyNeeded,
        forWhom: campaigns.forWhom,
        impact: campaigns.impact,
        campaignType: campaigns.campaignType,
        goalAmount: campaigns.goalAmount,
        targetVolunteers: campaigns.targetVolunteers,
        raisedAmount: campaigns.raisedAmount,
        campaignImage: campaigns.campaignImage,
        projectId: campaigns.projectId,
        presetTiers: campaigns.presetTiers,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        status: campaigns.status,
        createdBy: campaigns.createdBy,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
        volunteerCount: sql<number>`(select count(*) from ${campaignVolunteers} where ${campaignVolunteers.campaignId} = ${campaigns.id})`
      })
      .from(campaigns)
      .where(and(eq(campaigns.status, "active"), gt(campaigns.endDate, now)))
      .orderBy(desc(campaigns.createdAt));
  }),

  // Get completed campaigns
  getCompleted: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const now = new Date();
    return db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        description: campaigns.description,
        whyNeeded: campaigns.whyNeeded,
        forWhom: campaigns.forWhom,
        impact: campaigns.impact,
        campaignType: campaigns.campaignType,
        goalAmount: campaigns.goalAmount,
        targetVolunteers: campaigns.targetVolunteers,
        raisedAmount: campaigns.raisedAmount,
        campaignImage: campaigns.campaignImage,
        projectId: campaigns.projectId,
        presetTiers: campaigns.presetTiers,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        status: campaigns.status,
        createdBy: campaigns.createdBy,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
        volunteerCount: sql<number>`(select count(*) from ${campaignVolunteers} where ${campaignVolunteers.campaignId} = ${campaigns.id})`
      })
      .from(campaigns)
      .where(or(
        eq(campaigns.status, "completed"), 
        and(eq(campaigns.status, "active"), lte(campaigns.endDate, now))
      ))
      .orderBy(desc(campaigns.endDate));
  }),

  // Get campaign by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.select().from(campaigns).where(eq(campaigns.id, input.id)).limit(1);

      return result.length > 0 ? result[0] : null;
    }),

  // Get campaign donations
  getDonations: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      return db
        .select()
        .from(donations)
        .where(eq(donations.campaignId, input.campaignId))
        .orderBy(desc(donations.createdAt));
    }),

  // Get campaign stats
  getStats: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.campaignId))
        .limit(1);

      if (campaign.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      const [statsResult] = await db
        .select({
          total: sql<string>`sum(cast(amount as decimal(10,2)))`,
          count: sql<number>`count(*)`,
        })
        .from(donations)
        .where(
          and(
            eq(donations.campaignId, input.campaignId),
            eq(donations.paymentStatus, "completed")
          )
        );

      const totalRaised = parseFloat(statsResult?.total || "0");
      const goalAmount = parseFloat(campaign[0].goalAmount as unknown as string);
      const percentage = goalAmount > 0 ? (totalRaised / goalAmount) * 100 : 0;

      return {
        goalAmount,
        totalRaised,
        percentage: Math.min(percentage, 100),
        donorCount: statsResult?.count || 0,
        daysRemaining: Math.ceil(
          (campaign[0].endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      };
    }),

  // Update campaign status (admin only)
  updateStatus: adminProcedure
    .input(z.object({ campaignId: z.number(), status: z.enum(["active", "paused", "completed", "cancelled"]) }))
    .mutation(async ({ input }) => {

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(campaigns)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(campaigns.id, input.campaignId));

      return { success: true };
    }),

  // Join a volunteer campaign
  joinVolunteer: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const campaign = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
      if (campaign.length === 0 || campaign[0].campaignType !== "volunteer") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid campaign for volunteering" });
      }

      const existing = await db
        .select()
        .from(campaignVolunteers)
        .where(and(
          eq(campaignVolunteers.campaignId, input.campaignId),
          eq(campaignVolunteers.userId, ctx.user.id)
        ))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Already joined this campaign" });
      }

      await db.insert(campaignVolunteers).values({
        campaignId: input.campaignId,
        userId: ctx.user.id,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true };
    }),

  // Update volunteer status (admin only)
  updateVolunteerStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pending", "approved", "rejected", "completed"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(campaignVolunteers)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(campaignVolunteers.id, input.id));
      
      // Auto-completion check for volunteer campaigns
      if (input.status === "approved") {
        // Find which campaign this volunteer belongs to
        const volRecord = await db.select().from(campaignVolunteers).where(eq(campaignVolunteers.id, input.id)).limit(1);
        if (volRecord.length > 0) {
          const campaignId = volRecord[0].campaignId;
          const campaign = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
          
          if (campaign.length > 0 && campaign[0].status === "active" && campaign[0].targetVolunteers) {
            const approvedVols = await db.select().from(campaignVolunteers).where(and(
              eq(campaignVolunteers.campaignId, campaignId),
              eq(campaignVolunteers.status, "approved")
            ));
            
            if (approvedVols.length >= campaign[0].targetVolunteers) {
              await db.update(campaigns).set({ status: "completed", updatedAt: new Date() }).where(eq(campaigns.id, campaignId));
            }
          }
        }
      }

      return { success: true };
    }),

  // Manually mark campaign as completed (admin only)
  markCompleted: adminProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(campaigns)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(campaigns.id, input.campaignId));

      return { success: true };
    }),

  // Get volunteers for a campaign
  getVolunteers: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const volunteers = await db
        .select({
          id: campaignVolunteers.id,
          userId: campaignVolunteers.userId,
          status: campaignVolunteers.status,
          createdAt: campaignVolunteers.createdAt,
          name: users.name,
          email: users.email,
        })
        .from(campaignVolunteers)
        .innerJoin(users, eq(campaignVolunteers.userId, users.id))
        .where(eq(campaignVolunteers.campaignId, input.campaignId))
        .orderBy(desc(campaignVolunteers.createdAt));

      // Hide email and userId for non-admins
      const isAdmin = ctx.user?.role === "admin";
      if (!isAdmin) {
        return volunteers.map(v => ({
          id: v.id,
          status: v.status,
          createdAt: v.createdAt,
          name: v.name,
          email: "hidden@privacy.org",
        }));
      }

      return volunteers;
    }),
});
