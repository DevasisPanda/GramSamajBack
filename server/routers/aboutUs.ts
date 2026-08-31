import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { aboutUsSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../utils/audit";

const introParagraphSchema = z.object({
  text: z.string(),
  boldPrefix: z.string().optional(),
  isBoldSecondary: z.boolean().optional(),
});

const commitmentSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
});

const coreValueSchema = z.object({
  icon: z.string(),
  title: z.string(),
});

const defaultIntroParagraphs = [
  {
    boldPrefix: "Appropriate Institute of Rural Development (AIRD).",
    text: " Established as a public charitable trust, AIRD is dedicated to the holistic transformation of rural India by operationalising Mahatma Gandhi's vision of Gram Swaraj through the participatory KRANTI framework."
  },
  {
    text: "Guided by the ideals of Swami Vivekananda, Gautama Buddha, and the timeless philosophy of selfless service (Seva), AIRD works to build model self-reliant village republics with participatory governance, sustainable livelihoods, and character-building education."
  },
  {
    text: "We believe rural development is not merely about physical infrastructure, but the inner awakening and capacity-building of village communities to govern their own institutions with dignity and justice."
  },
  {
    isBoldSecondary: true,
    text: "AIRD stands as a catalyst and partner in community empowerment—enabling villagers to identify their own challenges, harness local resources, and pioneer sustainable grassroots solutions."
  }
];

const defaultCommitments = [
  {
    icon: "account_balance",
    title: "Decentralized Village Governance",
    description: "Strengthening Gram Sabhas and grassroots leadership to practice genuine participatory self-rule and transparent local management."
  },
  {
    icon: "nature_people",
    title: "Sustainable Rural Livelihoods",
    description: "Promoting organic farming, cottage industries, solar adoption, and value addition to protect rural ecology and generate local employment."
  },
  {
    icon: "school",
    title: "Moral & Character Education",
    description: "Fostering ethical values, vocational skills, and civic consciousness among rural children and youth for responsible nation-building."
  }
];

const defaultVisionPoints = [

  "No poor person goes to bed hungry.",
  "No child is deprived of education because of poverty.",
  "No widow is left without support and dignity.",
  "No family is trapped in the cycle of helplessness.",
  "No young person loses hope due to unemployment.",
  "No life is endangered by unsafe and degrading working conditions.",
  "Every individual receives equal opportunities for growth and success."
];

const defaultCoreValues = [
  { icon: "visibility", title: "Transparency" },
  { icon: "fact_check", title: "Accountability" },
  { icon: "gavel", title: "Integrity" },
  { icon: "volunteer_activism", title: "Compassion" }
];

export const aboutUsRouter = router({
  getSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const result = await db.select().from(aboutUsSettings).limit(1);
      if (result.length > 0) {
        return result[0];
      }

      // Return initial defaults matching current frontend code if no database row exists yet
      return {
        id: 0,
        quote: "True development begins when village communities awaken to their inherent strength and self-governance.",
        motto: "Service to Humanity is the Highest Worship.",
        trustName: "Appropriate Institute of Rural Development (AIRD)",
        regNo: "Regd. Public Charitable Trust",
        established: "1994",
        founder: "K. C. Tripathi",
        logoUrl: "/logo.png",
        introParagraphs: defaultIntroParagraphs,
        commitments: defaultCommitments,
        visionTitle: "Our Vision for Gram Swaraj",
        visionDescription: "We envision self-reliant village republics where economic justice, moral character, and participatory democracy flourish:",
        visionPoints: defaultVisionPoints,
        coreValues: defaultCoreValues,
        promiseTitle: "Our Promise",
        promiseText: "We commit ourselves to walking beside village communities until they establish full self-reliance, moral dignity, and community empowerment.",
        joinTitle: "Join Hands with AIRD",
        joinDescription: "AIRD warmly invites thinkers, social workers, institutions, and philanthropists to join hands in building live demonstration models of Gram Swaraj.",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

    } catch (error) {
      console.error("Error fetching about us settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch about us settings",
      });
    }
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        quote: z.string(),
        motto: z.string(),
        trustName: z.string(),
        regNo: z.string(),
        established: z.string(),
        founder: z.string(),
        logoUrl: z.string().optional(),
        introParagraphs: z.array(introParagraphSchema),
        commitments: z.array(commitmentSchema),
        visionTitle: z.string(),
        visionDescription: z.string(),
        visionPoints: z.array(z.string()),
        coreValues: z.array(coreValueSchema),
        promiseTitle: z.string(),
        promiseText: z.string(),
        joinTitle: z.string(),
        joinDescription: z.string(),
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
        const existing = await db.select().from(aboutUsSettings).limit(1);
        let settingsId = null;

        if (existing.length > 0) {
          settingsId = existing[0].id;
          // Update
          await db
            .update(aboutUsSettings)
            .set({
              quote: input.quote,
              motto: input.motto,
              trustName: input.trustName,
              regNo: input.regNo,
              established: input.established,
              founder: input.founder,
              logoUrl: input.logoUrl || "/aird-logo.png",
              introParagraphs: input.introParagraphs,
              commitments: input.commitments,
              visionTitle: input.visionTitle,
              visionDescription: input.visionDescription,
              visionPoints: input.visionPoints,
              coreValues: input.coreValues,
              promiseTitle: input.promiseTitle,
              promiseText: input.promiseText,
              joinTitle: input.joinTitle,
              joinDescription: input.joinDescription,
              updatedAt: new Date(),
            })
            .where(eq(aboutUsSettings.id, settingsId));
        } else {
          // Insert
          const [insertResult] = await db.insert(aboutUsSettings).values({
            quote: input.quote,
            motto: input.motto,
            trustName: input.trustName,
            regNo: input.regNo,
            established: input.established,
            founder: input.founder,
            logoUrl: input.logoUrl || "/aird-logo.png",
            introParagraphs: input.introParagraphs,
            commitments: input.commitments,
            visionTitle: input.visionTitle,
            visionDescription: input.visionDescription,
            visionPoints: input.visionPoints,
            coreValues: input.coreValues,
            promiseTitle: input.promiseTitle,
            promiseText: input.promiseText,
            joinTitle: input.joinTitle,
            joinDescription: input.joinDescription,
          });
          settingsId = insertResult.insertId;
        }

        await logAuditEvent(
          db,
          ctx.user.id,
          "UPDATE_ABOUT_US_SETTINGS",
          "about_us_settings",
          settingsId,
          null,
          ctx.req.ip
        );

        return { success: true, message: "About Us settings updated successfully" };
      } catch (error) {
        console.error("Error updating about us settings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to update about us settings: ',
        });
      }
    }),
});
