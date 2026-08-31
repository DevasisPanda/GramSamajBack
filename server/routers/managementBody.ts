import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { managementMembers } from "../../drizzle/schema";
import { eq, asc, sql } from "drizzle-orm";

const DEFAULT_MANAGEMENT_MEMBERS = [
  {
    displayOrder: 1,
    name: "Shri K. C. Tripathi",
    role: "Founder & Managing Trustee",
    image: "/assets/trustee.jpg",
    quote: `"True development begins when village communities awaken to their inherent strength and self-governance."`,
    bio: `A lifelong journey of service, learning, and collective action for rural communities. Inspired by the ideals of Gram Swaraj envisioned by Mahatma Gandhi, and the spiritual teachings of Swami Vivekananda and Gautama Buddha.

Born on 2nd February 1958, Shri Kamlesh Chandra Tripathi began his journey in rural development in 1982 at ATDA, Gandhi Bhawan, Lucknow, learning Participatory Action Research (PAR). Over four decades, he has dedicated his life to grassroots participatory governance, community empowerment, and the KRANTI blueprint for Gram Swaraj.`,
    points: JSON.stringify([
      { icon: 'account_balance', title: 'Gram Swaraj Vision', description: 'Dedicated to translating Mahatma Gandhi\'s dream of Gram Swaraj into reality at village level.' },
      { icon: 'psychology', title: 'Spiritual Science & PAR', description: 'Integrating inner awakening, meditation, and Participatory Action Research with community development.' },
      { icon: 'groups', title: 'Community Empowerment', description: 'Facilitating Gram Sabhas to evolve self-reliant planning, implementation, and social audit systems.' }
    ]),
    tag: "Managing Trustee",
    status: "active",
  },
  {
    displayOrder: 2,
    name: "Mrs. Neera Tripathi",
    role: "Convener",
    image: "/assets/member-placeholder.png",
    quote: `"Empowering women and rural youth is the bedrock of self-reliant villages."`,
    bio: `Managing Director, NGI.K. C. Tripathi.India. Dedicated leader steering the governance and institutional coordination of AIRD Trust initiatives across Uttar Pradesh.`,
    points: JSON.stringify([
      { icon: 'volunteer_activism', title: 'Institutional Coordination', description: 'Leading trust operations, partnerships, and executive coordination.' },
      { icon: 'family_restroom', title: 'Women Empowerment', description: 'Championing rural women self-help initiatives and family welfare.' }
    ]),
    tag: "Convener",
    status: "active",
  },
  {
    displayOrder: 3,
    name: "Er. K. P. Tripathi",
    role: "Adviser",
    image: "/assets/member-placeholder.png",
    quote: `"Technological innovation and sustainable agriculture must walk hand-in-hand in rural India."`,
    bio: `Secretary, Agri-Innovation Foundation (AIF). Agricultural engineering expert advising on rural appropriate technologies, sustainable farming systems, and rural enterprise innovation.`,
    points: JSON.stringify([
      { icon: 'eco', title: 'Agri-Innovation', description: 'Advising on appropriate agricultural technologies and eco-friendly farming practices.' },
      { icon: 'engineering', title: 'Technical Guidance', description: 'Guiding rural renewable energy, processing, and farming interventions.' }
    ]),
    tag: "Board of Advisers",
    status: "active",
  },
  {
    displayOrder: 4,
    name: "Professor Dr. Shivani Srivastava",
    role: "Adviser - Research & Education",
    image: "/assets/member-placeholder.png",
    quote: `"Action research must bridge the gap between academic knowledge and grassroots reality."`,
    bio: `Participatory Action Researcher, Netaji Subhash Chandra Bose Govt. Girls P. G. College, Lucknow. Guiding participatory research, educational curriculum, and social impact evaluations.`,
    points: JSON.stringify([
      { icon: 'school', title: 'Action Research', description: 'Guiding university students and researchers in village participatory studies.' },
      { icon: 'menu_book', title: 'Educational Programs', description: 'Developing character-building and value-oriented education for rural youth.' }
    ]),
    tag: "Board of Advisers",
    status: "active",
  },
  {
    displayOrder: 5,
    name: "Mr. Anuj Kumar Srivastava",
    role: "Adviser - Social Audit",
    image: "/assets/member-placeholder.png",
    quote: `"Transparency and accountability are the supreme pillars of community self-rule."`,
    bio: `National Level Trainer, Social Audit. Expert on government welfare scheme monitoring, MGNREGA social audits, and community accountability frameworks.`,
    points: JSON.stringify([
      { icon: 'fact_check', title: 'Social Audit', description: 'Training grassroots cadres in social audit methodology and transparent reporting.' },
      { icon: 'visibility', title: 'Accountability', description: 'Building citizen-led monitoring mechanisms for panchayat development works.' }
    ]),
    tag: "Board of Advisers",
    status: "active",
  },
  {
    displayOrder: 6,
    name: "Er. B. K. Singh",
    role: "Adviser - Social Audit & Capacity Building",
    image: "/assets/member-placeholder.png",
    quote: `"Empower the Change Agents, and the village will transform itself."`,
    bio: `National Level Trainer, Social Audit. Specialist in participatory planning, community mobilization, and rural leadership development.`,
    points: JSON.stringify([
      { icon: 'trending_up', title: 'Capacity Building', description: 'Conducting training courses for rural youth Change Agents (CAs).' },
      { icon: 'assignment', title: 'Governance Audits', description: 'Strengthening community oversight of developmental schemes.' }
    ]),
    tag: "Board of Advisers",
    status: "active",
  },
  {
    displayOrder: 7,
    name: "Mr. Mukesh Bhargava",
    role: "Adviser - Monitoring & Evaluation",
    image: "/assets/member-placeholder.png",
    quote: `"Rigorous evaluation ensures every developmental rupee reaches the last mile."`,
    bio: `L.C.C. - Social Audit, National Level Monitor. Extensive experience in evaluating rural development projects and government program delivery across multiple states.`,
    points: JSON.stringify([
      { icon: 'analytics', title: 'Project Evaluation', description: 'Designing monitoring frameworks for rural developmental interventions.' },
      { icon: 'verified', title: 'National Monitoring', description: 'Ensuring fidelity to statutory standards and beneficiary entitlement delivery.' }
    ]),
    tag: "Board of Advisers",
    status: "active",
  },
  {
    displayOrder: 8,
    name: "Mr. Anand Kumar Singh",
    role: "Adviser - Community Welfare",
    image: "/assets/member-placeholder.png",
    quote: `"Selfless community service unites hearts and builds resilient societies."`,
    bio: `Managing Secretary, Lions Trisha Maitri Ashram. Veteran humanitarian leader committed to healthcare accessibility, social relief, and charitable initiatives.`,
    points: JSON.stringify([
      { icon: 'health_and_safety', title: 'Healthcare Access', description: 'Promoting rural health camps and medical awareness programs.' },
      { icon: 'handshake', title: 'Community Networks', description: 'Connecting civil society organizations for collaborative rural upliftment.' }
    ]),
    tag: "Board of Advisers",
    status: "active",
  },
  {
    displayOrder: 9,
    name: "Mr. Virendra Kumar Awasthi",
    role: "Director",
    image: "/assets/member-placeholder.png",
    quote: `"Participatory development requires dedicated grassroots institutions."`,
    bio: `Founder, Center for Development Action (CDA). Senior development professional directing grassroots action programs, field interventions, and institutional partnerships.`,
    points: JSON.stringify([
      { icon: 'domain', title: 'Action Programs', description: 'Directing field projects, model village demonstrations, and local farmer groups.' },
      { icon: 'hub', title: 'Institutional Linkages', description: 'Building collaborations with banks, corporate CSR, and universities.' }
    ]),
    tag: "Board of Directors",
    status: "active",
  },
  {
    displayOrder: 10,
    name: "Mr. Atul Verma",
    role: "Comptroller",
    image: "/assets/member-placeholder.png",
    quote: `"Sustainable rural infrastructure harmonizes with nature and local culture."`,
    bio: `Architect, Chota Chand Ganj, Lucknow. Overseeing rural infrastructure planning, eco-friendly construction techniques, and institutional audit compliance.`,
    points: JSON.stringify([
      { icon: 'architecture', title: 'Eco-Architecture', description: 'Designing sustainable rural community spaces and Appropriate Ashrams.' },
      { icon: 'gavel', title: 'Compliance & Audits', description: 'Overseeing physical assets, layout planning, and regulatory standards.' }
    ]),
    tag: "Executive Leadership",
    status: "active",
  },
  {
    displayOrder: 11,
    name: "Mr. Gaurav Pandey",
    role: "Finance Controller",
    image: "/assets/member-placeholder.png",
    quote: `"Every contribution is a sacred trust demanding highest fiduciary transparency."`,
    bio: `Founder, Karm Foundation, Lucknow. Financial manager overseeing trust budgeting, financial transparency, statutory filings, and annual audits.`,
    points: JSON.stringify([
      { icon: 'savings', title: 'Financial Management', description: 'Managing trust accounts, statutory tax filings, and budgeting.' },
      { icon: 'receipt_long', title: 'Transparency', description: 'Publishing audited financial statements and annual balance sheets.' }
    ]),
    tag: "Executive Leadership",
    status: "active",
  },
  {
    displayOrder: 12,
    name: "Mr. Pranshu Tripathi",
    role: "General Manager",
    image: "/assets/member-placeholder.png",
    quote: `"Youth leadership and modern communication are vital to propel Gram Swaraj forward."`,
    bio: `Gram Swaraj Foundation, Lucknow. General Manager leading field operations, digital documentation, web publishing, and youth coordination.`,
    points: JSON.stringify([
      { icon: 'campaign', title: 'Field Operations', description: 'Coordinating daily field activities, youth outreach, and village documentation.' },
      { icon: 'public', title: 'Digital Documentation', description: 'Managing electronic records, website content, and social communication.' }
    ]),
    tag: "Executive Leadership",
    status: "active",
  },
];

async function ensureManagementTable(db: any) {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`management_members\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`displayOrder\` int NOT NULL DEFAULT 1,
        \`name\` varchar(255) NOT NULL,
        \`role\` varchar(255) NOT NULL,
        \`image\` text NOT NULL,
        \`quote\` text,
        \`bio\` text,
        \`points\` json,
        \`tag\` varchar(255),
        \`status\` enum('active','hidden') NOT NULL DEFAULT 'active',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure records exist with clean IDs 1..12 and AIRD names
    const firstRecord = await db.select().from(managementMembers).where(eq(managementMembers.displayOrder, 1)).limit(1);
    if (firstRecord.length === 0 || !firstRecord[0].bio || firstRecord[0].name.includes("Narayan")) {
      console.log("[ManagementBody] Refreshing management_members with AIRD Trust Board of Trustees...");
      await db.delete(managementMembers).where(sql`displayOrder <= 12`);
      for (const leader of DEFAULT_MANAGEMENT_MEMBERS) {
        await db.insert(managementMembers).values({
          id: leader.displayOrder,
          ...leader,
          status: leader.status as "active" | "hidden",
        });
      }
    }
  } catch (e) {
    console.warn("[ManagementBody] Auto table creation notice:", e);
  }
}

export const managementBodyRouter = router({
  // Public: Get all active members (auto-creates table & seeds if empty, failsafe fallback)
  getAll: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        return DEFAULT_MANAGEMENT_MEMBERS.map((m, idx) => ({ id: idx + 1, ...m, points: JSON.parse(m.points) }));
      }

      await ensureManagementTable(db);

      let members = await db
        .select()
        .from(managementMembers)
        .where(eq(managementMembers.status, "active"))
        .orderBy(asc(managementMembers.displayOrder));

      if (members.length === 0) {
        console.log("[ManagementBody] Seeding 12 default management members into database...");
        for (const defaultMember of DEFAULT_MANAGEMENT_MEMBERS) {
          await db.insert(managementMembers).values({
            ...defaultMember,
            status: defaultMember.status as "active" | "hidden",
          });
        }

        members = await db
          .select()
          .from(managementMembers)
          .where(eq(managementMembers.status, "active"))
          .orderBy(asc(managementMembers.displayOrder));
      }

      return members.map((m) => ({
        ...m,
        points: typeof m.points === "string" ? JSON.parse(m.points) : m.points || [],
      }));
    } catch (error) {
      console.error("[ManagementBody] DB Query failed, serving fallback 12 members:", error);
      return DEFAULT_MANAGEMENT_MEMBERS.map((m, idx) => ({ id: idx + 1, ...m, points: JSON.parse(m.points) }));
    }
  }),

  // Public: Get single member by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (db) {
          await ensureManagementTable(db);
          const result = await db
            .select()
            .from(managementMembers)
            .where(eq(managementMembers.id, input.id))
            .limit(1);

          if (result.length > 0) {
            const m = result[0];
            return {
              ...m,
              points: typeof m.points === "string" ? JSON.parse(m.points) : m.points || [],
            };
          }
        }
      } catch (error) {
        console.error("[ManagementBody] DB getById failed, checking fallback:", error);
      }

      const defaultMember = DEFAULT_MANAGEMENT_MEMBERS[input.id - 1];
      if (defaultMember) {
        return {
          id: input.id,
          ...defaultMember,
          points: JSON.parse(defaultMember.points),
        };
      }

      return null;
    }),

  // Admin: Get all members (active & hidden)
  adminGetAll: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        return DEFAULT_MANAGEMENT_MEMBERS.map((m, idx) => ({ id: idx + 1, ...m, points: JSON.parse(m.points) }));
      }

      await ensureManagementTable(db);

      let members = await db
        .select()
        .from(managementMembers)
        .orderBy(asc(managementMembers.displayOrder));

      if (members.length === 0) {
        console.log("[ManagementBody] Seeding 12 default management members for admin...");
        for (const defaultMember of DEFAULT_MANAGEMENT_MEMBERS) {
          await db.insert(managementMembers).values({
            ...defaultMember,
            status: defaultMember.status as "active" | "hidden",
          });
        }

        members = await db
          .select()
          .from(managementMembers)
          .orderBy(asc(managementMembers.displayOrder));
      }

      return members.map((m) => ({
        ...m,
        points: typeof m.points === "string" ? JSON.parse(m.points) : m.points || [],
      }));
    } catch (error) {
      console.error("[ManagementBody] adminGetAll failed, serving fallback 12 members:", error);
      return DEFAULT_MANAGEMENT_MEMBERS.map((m, idx) => ({ id: idx + 1, ...m, points: JSON.parse(m.points) }));
    }
  }),

  // Admin: Create member
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        role: z.string().min(1, "Role is required"),
        image: z.string().min(1, "Photo image is required"),
        quote: z.string().optional(),
        bio: z.string().optional(),
        points: z.any().optional(),
        tag: z.string().optional(),
        displayOrder: z.number().default(1),
        status: z.enum(["active", "hidden"]).default("active"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        await ensureManagementTable(db);
        const pointsStr = typeof input.points === "string" ? input.points : JSON.stringify(input.points || []);

        await db.insert(managementMembers).values({
          name: input.name,
          role: input.role,
          image: input.image,
          quote: input.quote || "",
          bio: input.bio || "",
          points: pointsStr,
          tag: input.tag || input.role,
          displayOrder: input.displayOrder,
          status: input.status,
        });

        return { success: true, message: "Management member created successfully" };
      } catch (error) {
        console.error("Error creating management member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create management member",
        });
      }
    }),

  // Admin: Update member
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Name is required"),
        role: z.string().min(1, "Role is required"),
        image: z.string().min(1, "Photo image is required"),
        quote: z.string().optional(),
        bio: z.string().optional(),
        points: z.any().optional(),
        tag: z.string().optional(),
        displayOrder: z.number(),
        status: z.enum(["active", "hidden"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const pointsStr = typeof input.points === "string" ? input.points : JSON.stringify(input.points || []);

        await db
          .update(managementMembers)
          .set({
            name: input.name,
            role: input.role,
            image: input.image,
            quote: input.quote || "",
            bio: input.bio || "",
            points: pointsStr,
            tag: input.tag || input.role,
            displayOrder: input.displayOrder,
            status: input.status,
            updatedAt: new Date(),
          })
          .where(eq(managementMembers.id, input.id));

        return { success: true, message: "Management member updated successfully" };
      } catch (error) {
        console.error("Error updating management member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update management member",
        });
      }
    }),

  // Admin: Delete member
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        await db.delete(managementMembers).where(eq(managementMembers.id, input.id));
        return { success: true, message: "Management member deleted successfully" };
      } catch (error) {
        console.error("Error deleting management member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete management member",
        });
      }
    }),
});
