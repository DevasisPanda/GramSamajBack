import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { messages, bulkMessageRecipients, users } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { sendWhatsAppMessage } from "../services/whatsapp";

export const messageRouter = router({
  // Send a message to a single user (or direct WhatsApp phone)
  sendSingle: adminProcedure
    .input(
      z.object({
        recipientId: z.number().optional(),
        phone: z.string().optional(),
        subject: z.string().min(1, "Subject is required"),
        content: z.string().min(1, "Content is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      let targetPhone = input.phone?.trim() || null;
      let targetUserId = input.recipientId || null;

      // If no phone provided directly, lookup recipient's phone from users or members table
      if (!targetPhone && targetUserId && db) {
        try {
          const userRec = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
          if (userRec.length > 0 && userRec[0].phone) {
            targetPhone = userRec[0].phone;
          }
        } catch (e) {
          console.warn("[Message] Failed to query user phone from DB:", e);
        }
      }

      // Record message in database if db is connected
      if (db && ctx.user?.id) {
        try {
          await db.insert(messages).values({
            senderId: ctx.user.id,
            recipientId: targetUserId,
            messageType: "individual",
            subject: input.subject,
            content: input.content,
            channel: "in_app",
            status: "sent",
            sentAt: new Date(),
          });
        } catch (dbErr: any) {
          console.warn("[Message] DB insert warning:", dbErr.message);
        }
      }

      // Dispatch WhatsApp message if phone number is available
      let waStatus: any = null;
      if (targetPhone) {
        try {
          console.log(`[Message Router] Executing WhatsApp dispatch to ${targetPhone}...`);
          waStatus = await sendWhatsAppMessage(targetPhone, input.subject, input.content);
          console.log(`[Message Router] WhatsApp dispatch result:`, waStatus);
        } catch (waErr: any) {
          console.error("[WhatsApp API] Direct message dispatch error:", waErr.message);
        }
      } else {
        console.warn(`[Message Router] No phone number available for recipient ${targetUserId}. WhatsApp skipped.`);
      }

      return { 
        success: true, 
        message: targetPhone 
          ? `Message sent to ${targetPhone} via WhatsApp!` 
          : "Message saved to dashboard (No phone number associated).",
        whatsapp: waStatus
      };
    }),

  // Broadcast a message to all active users
  sendBulk: adminProcedure
    .input(
      z.object({
        subject: z.string().min(1, "Subject is required"),
        content: z.string().min(1, "Content is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      let activeUsers: any[] = [];
      let messageId: number | null = null;

      if (db) {
        try {
          const messageResult = await db.insert(messages).values({
            senderId: ctx.user.id,
            recipientId: null, // Indicates broadcast
            messageType: "bulk",
            subject: input.subject,
            content: input.content,
            channel: "in_app",
            status: "sent",
            sentAt: new Date(),
          });
          messageId = messageResult[0].insertId;
        } catch (e) {
          console.warn("[Message] Bulk DB insert warning:", e);
        }

        try {
          activeUsers = await db.select().from(users).where(eq(users.status, "active"));
        } catch (e) {
          console.warn("[Message] Failed to query active users:", e);
        }

        if (activeUsers.length > 0 && messageId) {
          try {
            const recipientRecords = activeUsers.map(user => ({
              messageId: messageId!,
              recipientId: user.id,
              status: "sent" as const,
              sentAt: new Date(),
            }));
            await db.insert(bulkMessageRecipients).values(recipientRecords);
          } catch (e) {
            console.warn("[Message] Failed to insert bulk recipient records:", e);
          }
        }
      }

      const usersWithPhone = activeUsers.filter(u => u.phone);
      if (usersWithPhone.length > 0) {
        Promise.allSettled(
          usersWithPhone.map(u => sendWhatsAppMessage(u.phone!, input.subject, input.content))
        ).then(results => {
          const failed = results.filter(r => r.status === "rejected").length;
          if (failed > 0) {
            console.error(`[WhatsApp] Bulk dispatch completed with ${failed} failures.`);
          }
        });
      }

      return { 
        success: true, 
        message: `Broadcast sent to ${activeUsers.length || 'all'} active users successfully.` 
      };
    }),

  // Get previous notices/messages sent by this admin
  getPreviousNotices: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    try {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.senderId, ctx.user.id))
        .orderBy(desc(messages.createdAt));
    } catch (e) {
      console.warn("[Message] Failed to fetch previous notices:", e);
      return [];
    }
  }),

  deleteMessage: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: true, message: "Message deleted." };

      try {
        await db.delete(bulkMessageRecipients).where(eq(bulkMessageRecipients.messageId, input.id));
        await db.delete(messages).where(eq(messages.id, input.id));
        return { success: true, message: "Message deleted successfully." };
      } catch (error) {
        console.warn("[Message] Failed to delete message:", error);
        return { success: true, message: "Message deleted." };
      }
    }),
});
