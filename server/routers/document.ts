import { z } from "zod";
import { protectedProcedure, router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { idCards, certificates, appointmentLetters, members, users, organizationCertificates, certificateTemplates } from "../../drizzle/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { randomBytes } from "crypto";

export const documentRouter = router({
  // ID Card Operations
  generateIDCard: adminProcedure
    .input(
      z.object({
        memberId: z.number(),
        expiryDate: z.date().optional(),
        designation: z.string().optional(),
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
        // If designation is passed, update the user's designation in the database
        if (input.designation) {
          const memberRecord = await db.select().from(members).where(eq(members.id, input.memberId)).limit(1);
          if (memberRecord.length > 0 && memberRecord[0].userId) {
            await db.update(users).set({ designation: input.designation }).where(eq(users.id, memberRecord[0].userId));
          }
        }

        const randomSuffix = randomBytes(3).toString("hex").toUpperCase();
        const cardNumber = `CARD-${randomSuffix}`;
        const expiry = input.expiryDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1));

        await db.insert(idCards).values({
          memberId: input.memberId,
          cardNumber,
          qrCode: `qr_${cardNumber}`,
          issueDate: new Date(),
          expiryDate: expiry,
          status: "active",
        });

        return {
          success: true,
          message: "ID Card generated successfully",
          cardNumber,
          cardId: 0,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to generate ID card: ',
        });
      }
    }),

  getIDCards: adminProcedure
    .input(z.object({ memberId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const query = db
          .select({
            id: idCards.id,
            memberId: idCards.memberId,
            cardNumber: idCards.cardNumber,
            qrCode: idCards.qrCode,
            issueDate: idCards.issueDate,
            expiryDate: idCards.expiryDate,
            status: idCards.status,
            memberName: users.name,
            memberEmail: users.email,
            memberPhone: users.phone,
            memberCity: users.city,
            memberProfileImage: users.profileImage,
            memberDesignation: users.designation,
          })
          .from(idCards)
          .leftJoin(members, eq(idCards.memberId, members.id))
          .leftJoin(users, eq(members.userId, users.id));

        if (input?.memberId) {
          return await query.where(eq(idCards.memberId, input.memberId));
        }
        return await query;
      } catch (error) {
        console.error("Error fetching ID cards:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to fetch ID cards: ',
        });
      }
    }),

  verifyIDCard: publicProcedure
    .input(z.object({ qrCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const result = await db
          .select({
            card: idCards,
            memberName: users.name,
            memberProfileImage: users.profileImage,
            memberDesignation: users.designation,
            memberEmail: users.email,
            memberPhone: users.phone,
            memberCity: users.city,
            membershipNumber: members.membershipNumber,
          })
          .from(idCards)
          .leftJoin(members, eq(idCards.memberId, members.id))
          .leftJoin(users, eq(members.userId, users.id))
          .where(
            or(
              eq(idCards.qrCode, input.qrCode),
              eq(idCards.cardNumber, input.qrCode)
            )
          )
          .limit(1);

        if (result.length === 0) {
          return { valid: false, message: "ID Card not found" };
        }

        const cardData = result[0];
        const card = cardData.card;
        const isExpired = card.expiryDate && new Date() > card.expiryDate;

        return {
          valid: !isExpired && card.status === "active",
          card: {
            cardNumber: card.cardNumber,
            expiryDate: card.expiryDate,
            status: card.status,
            isExpired,
          },
          member: {
            name: cardData.memberName,
            profileImage: cardData.memberProfileImage,
            designation: cardData.memberDesignation,
            email: cardData.memberEmail,
            phone: cardData.memberPhone,
            city: cardData.memberCity,
            membershipNumber: cardData.membershipNumber,
          },
          message: isExpired ? "ID Card has expired" : "ID Card is valid",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Verification failed: ',
        });
      }
    }),

  // Certificate Operations
  generateCertificate: adminProcedure
    .input(
      z.object({
        recipientId: z.number(),
        certificateType: z.enum(["membership", "achievement", "visitor", "volunteer"]),
        title: z.string(),
        description: z.string().optional(),
        certificateImage: z.string().optional(),
        expiryDate: z.date().optional(),
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
        const randomSuffix = randomBytes(3).toString("hex").toUpperCase();
        const certificateNumber = `AIRD-${randomSuffix}`;

        await db.insert(certificates).values({
          recipientId: input.recipientId,
          certificateType: input.certificateType,
          certificateNumber,
          title: input.title,
          description: input.description,
          certificateImage: input.certificateImage || "",
          issueDate: new Date(),
          expiryDate: input.expiryDate,
          qrCode: `qr_cert_${certificateNumber}`,
          status: "active",
        });

        return {
          success: true,
          message: "Certificate generated successfully",
          certificateNumber,
          certificateId: 0,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to generate certificate: ',
        });
      }
    }),

  getCertificates: adminProcedure
    .input(
      z.object({
        recipientId: z.number().optional(),
        certificateType: z.enum(["membership", "achievement", "visitor", "volunteer"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const query = db
          .select({
            id: certificates.id,
            recipientId: certificates.recipientId,
            certificateType: certificates.certificateType,
            certificateNumber: certificates.certificateNumber,
            title: certificates.title,
            description: certificates.description,
            certificateImage: certificates.certificateImage,
            issueDate: certificates.issueDate,
            expiryDate: certificates.expiryDate,
            qrCode: certificates.qrCode,
            status: certificates.status,
            recipientName: users.name,
            recipientEmail: users.email,
            recipientPhone: users.phone,
          })
          .from(certificates)
          .leftJoin(users, eq(certificates.recipientId, users.id))
          .orderBy(desc(certificates.issueDate));

        if (input?.recipientId && input?.certificateType) {
          return await query.where(
            and(
              eq(certificates.recipientId, input.recipientId),
              eq(certificates.certificateType, input.certificateType)
            )
          );
        }

        if (input?.recipientId) {
          return await query.where(eq(certificates.recipientId, input.recipientId));
        }

        if (input?.certificateType) {
          return await query.where(eq(certificates.certificateType, input.certificateType));
        }

        return await query;
      } catch (error) {
        console.error("Error fetching certificates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch certificates",
        });
      }
    }),

  verifyCertificate: publicProcedure
    .input(z.object({ qrCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const result = await db
          .select({
            certificate: certificates,
            recipientName: users.name,
            recipientProfileImage: users.profileImage,
            recipientDesignation: users.designation,
            recipientEmail: users.email,
          })
          .from(certificates)
          .leftJoin(users, eq(certificates.recipientId, users.id))
          .where(
            or(
              eq(certificates.qrCode, input.qrCode),
              eq(certificates.certificateNumber, input.qrCode)
            )
          )
          .limit(1);

        if (result.length === 0) {
          return { valid: false, message: "Certificate not found" };
        }

        const certData = result[0];
        const cert = certData.certificate;
        const isExpired = cert.expiryDate && new Date() > cert.expiryDate;

        return {
          valid: !isExpired && cert.status === "active",
          certificate: {
            certificateNumber: cert.certificateNumber,
            title: cert.title,
            certificateType: cert.certificateType,
            issueDate: cert.issueDate,
            expiryDate: cert.expiryDate,
            status: cert.status,
            isExpired,
          },
          recipient: {
            name: certData.recipientName,
            profileImage: certData.recipientProfileImage,
            designation: certData.recipientDesignation,
            email: certData.recipientEmail,
          },
          message: isExpired ? "Certificate has expired" : "Certificate is valid",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Verification failed: ',
        });
      }
    }),

  deleteCertificate: adminProcedure
    .input(z.object({ certificateId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        await db.delete(certificates).where(eq(certificates.id, input.certificateId));
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to delete certificate: ',
        });
      }
    }),

  deleteIDCard: adminProcedure
    .input(z.object({ cardId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        await db.delete(idCards).where(eq(idCards.id, input.cardId));
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to delete ID card: ',
        });
      }
    }),

  deleteAppointmentLetter: adminProcedure
    .input(z.object({ letterId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        await db.delete(appointmentLetters).where(eq(appointmentLetters.id, input.letterId));
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to delete appointment letter: ',
        });
      }
    }),

  // Appointment Letter Operations
  generateAppointmentLetter: adminProcedure
    .input(
      z.object({
        recipientId: z.number(),
        position: z.string(),
        department: z.string().optional(),
        appointmentDate: z.date(),
        letterContent: z.string(),
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
        const randomSuffix = randomBytes(3).toString("hex").toUpperCase();
        const letterNumber = `APPT-${randomSuffix}`;

        await db.insert(appointmentLetters).values({
          recipientId: input.recipientId,
          letterNumber,
          position: input.position,
          department: input.department,
          appointmentDate: input.appointmentDate,
          letterContent: input.letterContent,
          qrCode: `qr_appt_${letterNumber}`,
          issuedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: "Appointment letter generated successfully",
          letterNumber,
          letterId: 0,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to generate appointment letter: ',
        });
      }
    }),

  getAppointmentLetters: adminProcedure
    .input(z.object({ recipientId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const conditions = [];
        if (input?.recipientId) {
          conditions.push(eq(appointmentLetters.recipientId, input.recipientId));
        }

        const query = db
          .select({
            id: appointmentLetters.id,
            recipientId: appointmentLetters.recipientId,
            letterNumber: appointmentLetters.letterNumber,
            position: appointmentLetters.position,
            department: appointmentLetters.department,
            appointmentDate: appointmentLetters.appointmentDate,
            letterContent: appointmentLetters.letterContent,
            qrCode: appointmentLetters.qrCode,
            recipientName: users.name,
            recipientEmail: users.email,
            recipientPhone: users.phone,
          })
          .from(appointmentLetters)
          .leftJoin(users, eq(appointmentLetters.recipientId, users.id));

        if (conditions.length > 0) {
          query.where(and(...conditions));
        }

        return await query.orderBy(desc(appointmentLetters.appointmentDate));
      } catch (error) {
        console.error("Error fetching appointment letters:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to fetch appointment letters: ',
        });
      }
    }),

  verifyAppointmentLetter: publicProcedure
    .input(z.object({ qrCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const result = await db
          .select({
            letter: appointmentLetters,
            recipientName: users.name,
            recipientPhone: users.phone,
            recipientEmail: users.email,
          })
          .from(appointmentLetters)
          .leftJoin(users, eq(appointmentLetters.recipientId, users.id))
          .where(
            or(
              eq(appointmentLetters.qrCode, input.qrCode),
              eq(appointmentLetters.letterNumber, input.qrCode)
            )
          )
          .limit(1);

        if (result.length === 0) {
          return { valid: false, message: "Appointment letter not found" };
        }

        const letterData = result[0];
        const letter = letterData.letter;
        return {
          valid: true,
          letter: {
            letterNumber: letter.letterNumber,
            position: letter.position,
            department: letter.department,
            appointmentDate: letter.appointmentDate,
            recipientName: letterData.recipientName,
            recipientPhone: letterData.recipientPhone,
            recipientEmail: letterData.recipientEmail,
          },
          message: "Appointment letter is valid",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Verification failed: ',
        });
      }
    }),

  // Get logged-in user's certificates (protectedProcedure)
  getMyCertificates: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        return await db
          .select()
          .from(certificates)
          .where(eq(certificates.recipientId, ctx.user.id))
          .orderBy(desc(certificates.issueDate));
      } catch (error) {
        console.error("Error fetching my certificates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch certificates",
        });
      }
    }),

  // Get logged-in user's ID card (protectedProcedure)
  getMyIDCard: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const memberRec = await db
          .select({ id: members.id })
          .from(members)
          .where(eq(members.userId, ctx.user.id))
          .limit(1);

        if (memberRec.length === 0) return null;

        const result = await db
          .select()
          .from(idCards)
          .where(eq(idCards.memberId, memberRec[0].id))
          .limit(1);

        return result.length > 0 ? result[0] : null;
      } catch (error) {
        console.error("Error fetching my ID card:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to fetch ID card: ',
        });
      }
    }),

  // Get logged-in user's appointment letters (protectedProcedure)
  getMyAppointmentLetters: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        return await db
          .select()
          .from(appointmentLetters)
          .where(eq(appointmentLetters.recipientId, ctx.user.id))
          .orderBy(desc(appointmentLetters.createdAt));
      } catch (error) {
        console.error("Error fetching my appointment letters:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to fetch appointment letters: ',
        });
      }
    }),

  // Organization Certificate Operations
  getOrgCertificates: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        return await db.select().from(organizationCertificates).orderBy(desc(organizationCertificates.createdAt));
      } catch (error) {
        console.error("Error fetching organization certificates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to fetch organization certificates: ',
        });
      }
    }),

  createOrgCertificate: adminProcedure
    .input(
      z.object({
        name: z.string(),
        imageUrl: z.string(),
        description: z.string().optional(),
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
        await db.insert(organizationCertificates).values({
          name: input.name,
          imageUrl: input.imageUrl,
          description: input.description,
        });
        return { success: true, message: "Organization certificate added successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to add organization certificate: ',
        });
      }
    }),

  updateOrgCertificate: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string(),
        imageUrl: z.string(),
        description: z.string().optional(),
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
        await db
          .update(organizationCertificates)
          .set({
            name: input.name,
            imageUrl: input.imageUrl,
            description: input.description,
          })
          .where(eq(organizationCertificates.id, input.id));
        return { success: true, message: "Organization certificate updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to update organization certificate: ',
        });
      }
    }),

  deleteOrgCertificate: adminProcedure
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
        await db.delete(organizationCertificates).where(eq(organizationCertificates.id, input.id));
        return { success: true, message: "Organization certificate deleted successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to delete organization certificate: ',
        });
      }
    }),

  getTemplateConfigs: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        const templates = await db.select().from(certificateTemplates);
        // Force delete any stored id_card template row from MySQL to guarantee x: 300, y: 525 override
        for (const t of templates) {
          if (t.type === "id_card") {
            await db.delete(certificateTemplates).where(eq(certificateTemplates.id, t.id));
          }
        }
        return await db.select().from(certificateTemplates);
      } catch (error) {
        console.error("Error fetching template configs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to fetch template configs: ',
        });
      }
    }),

  saveTemplateConfig: adminProcedure
    .input(
      z.object({
        type: z.string(),
        name: z.string(),
        templateImage: z.string().optional(),
        designJson: z.any(),
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
        const existing = await db
          .select()
          .from(certificateTemplates)
          .where(eq(certificateTemplates.type, input.type))
          .limit(1);

        const jsonStr = typeof input.designJson === "string" ? input.designJson : JSON.stringify(input.designJson);

        if (existing.length > 0) {
          await db
            .update(certificateTemplates)
            .set({
              name: input.name,
              templateImage: input.templateImage || existing[0].templateImage,
              designJson: jsonStr,
              updatedAt: new Date(),
            })
            .where(eq(certificateTemplates.type, input.type));
        } else {
          await db.insert(certificateTemplates).values({
            name: input.name,
            type: input.type,
            templateImage: input.templateImage || "",
            designJson: jsonStr,
          });
        }
        return { success: true, message: "Template layout saved successfully" };
      } catch (error) {
        console.error("Error saving template config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save template config",
        });
      }
    }),

  resetTemplateConfig: adminProcedure
    .input(z.object({ type: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      try {
        await db.delete(certificateTemplates).where(eq(certificateTemplates.type, input.type));
        return { success: true, message: "Template layout reset to clean default successfully" };
      } catch (error) {
        console.error("Error resetting template config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset template config",
        });
      }
    }),
});
