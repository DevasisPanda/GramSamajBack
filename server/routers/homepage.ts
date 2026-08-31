import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { homepageSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../utils/audit";

export const homepageRouter = router({
  getSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const result = await db.select().from(homepageSettings).limit(1);
      if (result.length > 0) {
        return result[0];
      }

      // Return default values if no row exists yet
      return {
        id: 0,
        heroTitle: "Appropriate Institute of Rural Development (AIRD Trust)",
        heroDescription: "Pioneering the KRANTI blueprint for Gram Swaraj — empowering rural communities through self-reliance, moral education, and decentralised participatory development.",
        heroImage: "",
        heroImage2: "",
        heroImage3: "",
        heroImage4: "",
        heroImage5: "",
        showDonateButton: true,
        quickLink1Text: "Gram Swaraj Strategy",
        quickLink1Url: "/strategy",
        quickLink2Text: "KRANTI Framework",
        quickLink2Url: "/kranti",
        quickLink3Text: "Activities Calendar",
        quickLink3Url: "/activities",
        quickLink4Text: "Donate to AIRD",
        quickLink4Url: "/donate",
        donateSmileTitle: "Empower Rural Communities",
        donateSmileContent: "Your support empowers villagers, women self-help groups, and rural youth toward sustainable self-governance.",
        donateSmileImage: "",
        donateSmileTitle2: "Gram Swaraj Movement",
        donateSmileContent2: "Establish demonstration villages based on Mahatma Gandhi and Swami Vivekananda's ideals of village autonomy and self-reliance.",
        donateSmileImage2: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1000&auto=format&fit=crop",
        donateSmileTitle3: "Education & Ethics",
        donateSmileContent3: "Provide value-oriented education, vocational skills, and moral literacy to village children and youth.",
        donateSmileImage3: "",
        donateSmileTitle4: "Livelihood & Khadi Support",
        donateSmileContent4: "Promote traditional village industries, solar power, organic farming, and cottage manufacturing.",
        donateSmileImage4: "",
        donateSmileTitle5: "Women Leadership",
        donateSmileContent5: "Empower rural women through micro-enterprises, healthcare awareness, and local governance participation.",
        donateSmileImage5: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

    } catch (error) {
      console.error("Error fetching homepage settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: 'Failed to fetch homepage settings: ',
      });
    }
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        heroTitle: z.string(),
        heroDescription: z.string().optional(),
        heroImage: z.string().optional(),
        heroImage2: z.string().optional(),
        heroImage3: z.string().optional(),
        heroImage4: z.string().optional(),
        heroImage5: z.string().optional(),
        showDonateButton: z.boolean().optional(),
        quickLink1Text: z.string(),
        quickLink1Url: z.string(),
        quickLink2Text: z.string(),
        quickLink2Url: z.string(),
        quickLink3Text: z.string(),
        quickLink3Url: z.string(),
        quickLink4Text: z.string(),
        quickLink4Url: z.string(),
        donateSmileTitle: z.string(),
        donateSmileContent: z.string().optional(),
        donateSmileImage: z.string().optional(),
        donateSmileTitle2: z.string().optional(),
        donateSmileContent2: z.string().optional(),
        donateSmileImage2: z.string().optional(),
        donateSmileTitle3: z.string().optional(),
        donateSmileContent3: z.string().optional(),
        donateSmileImage3: z.string().optional(),
        donateSmileTitle4: z.string().optional(),
        donateSmileContent4: z.string().optional(),
        donateSmileImage4: z.string().optional(),
        donateSmileTitle5: z.string().optional(),
        donateSmileContent5: z.string().optional(),
        donateSmileImage5: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const existing = await db.select().from(homepageSettings).limit(1);
        let settingsId = null;

        if (existing.length > 0) {
          settingsId = existing[0].id;
          // Update
          await db
            .update(homepageSettings)
            .set({
              heroTitle: input.heroTitle,
              heroDescription: input.heroDescription || null,
              heroImage: input.heroImage || null,
              heroImage2: input.heroImage2 || null,
              heroImage3: input.heroImage3 || null,
              heroImage4: input.heroImage4 || null,
              heroImage5: input.heroImage5 || null,
              showDonateButton: input.showDonateButton !== undefined ? input.showDonateButton : true,
              quickLink1Text: input.quickLink1Text,
              quickLink1Url: input.quickLink1Url,
              quickLink2Text: input.quickLink2Text,
              quickLink2Url: input.quickLink2Url,
              quickLink3Text: input.quickLink3Text,
              quickLink3Url: input.quickLink3Url,
              quickLink4Text: input.quickLink4Text,
              quickLink4Url: input.quickLink4Url,
              donateSmileTitle: input.donateSmileTitle,
              donateSmileContent: input.donateSmileContent || null,
              donateSmileImage: input.donateSmileImage || null,
              donateSmileTitle2: input.donateSmileTitle2 || null,
              donateSmileContent2: input.donateSmileContent2 || null,
              donateSmileImage2: input.donateSmileImage2 || null,
              donateSmileTitle3: input.donateSmileTitle3 || null,
              donateSmileContent3: input.donateSmileContent3 || null,
              donateSmileImage3: input.donateSmileImage3 || null,
              donateSmileTitle4: input.donateSmileTitle4 || null,
              donateSmileContent4: input.donateSmileContent4 || null,
              donateSmileImage4: input.donateSmileImage4 || null,
              donateSmileTitle5: input.donateSmileTitle5 || null,
              donateSmileContent5: input.donateSmileContent5 || null,
              donateSmileImage5: input.donateSmileImage5 || null,
            })
            .where(eq(homepageSettings.id, settingsId));
        } else {
          // Insert
          const [insertResult] = await db.insert(homepageSettings).values({
            heroTitle: input.heroTitle,
            heroDescription: input.heroDescription || "",
            heroImage: input.heroImage || "",
            heroImage2: input.heroImage2 || "",
            heroImage3: input.heroImage3 || "",
            heroImage4: input.heroImage4 || "",
            heroImage5: input.heroImage5 || "",
            showDonateButton: input.showDonateButton !== undefined ? input.showDonateButton : true,
            quickLink1Text: input.quickLink1Text,
            quickLink1Url: input.quickLink1Url,
            quickLink2Text: input.quickLink2Text,
            quickLink2Url: input.quickLink2Url,
            quickLink3Text: input.quickLink3Text,
            quickLink3Url: input.quickLink3Url,
            quickLink4Text: input.quickLink4Text,
            quickLink4Url: input.quickLink4Url,
            donateSmileTitle: input.donateSmileTitle,
            donateSmileContent: input.donateSmileContent || "",
            donateSmileImage: input.donateSmileImage || "",
            donateSmileTitle2: input.donateSmileTitle2 || "",
            donateSmileContent2: input.donateSmileContent2 || "",
            donateSmileImage2: input.donateSmileImage2 || "",
            donateSmileTitle3: input.donateSmileTitle3 || "",
            donateSmileContent3: input.donateSmileContent3 || "",
            donateSmileImage3: input.donateSmileImage3 || "",
            donateSmileTitle4: input.donateSmileTitle4 || "",
            donateSmileContent4: input.donateSmileContent4 || "",
            donateSmileImage4: input.donateSmileImage4 || "",
            donateSmileTitle5: input.donateSmileTitle5 || "",
            donateSmileContent5: input.donateSmileContent5 || "",
            donateSmileImage5: input.donateSmileImage5 || "",
          });
          settingsId = insertResult.insertId;
        }

        await logAuditEvent(
          db,
          ctx.user.id,
          "UPDATE_HOMEPAGE_SETTINGS",
          "homepage_settings",
          settingsId,
          null,
          ctx.req.ip
        );

        return { success: true, message: "Homepage settings updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update homepage settings",
        });
      }
    }),
});
