import { z } from "zod";
import { publicProcedure, router, adminProcedure } from "../_core/trpc";

/**
 * Stub routers for features that are planned but not yet implemented.
 * These use proper access control (protectedProcedure / adminProcedure)
 * even as stubs to establish the correct security pattern.
 */
export const stubRouters = {

  idCard: router({
    generate: adminProcedure.input(z.object({ memberId: z.number() })).mutation(async () => ({ success: true })),
    download: adminProcedure.input(z.object({ cardId: z.number() })).query(async () => ({ url: "" })),
  }),

  certificate: router({
    list: adminProcedure.query(async () => []),
    generate: adminProcedure.input(z.object({ type: z.string(), recipientId: z.number() })).mutation(async () => ({ success: true })),
  }),

  dashboard: router({
    getStats: adminProcedure.query(async () => ({
      totalMembers: 0,
      totalDonations: 0,
      activeCampaigns: 0,
      beneficiariesHelped: 0,
    })),
  }),

  communication: router({
    sendBulkMessage: adminProcedure.input(z.object({ message: z.string() })).mutation(async () => ({ success: true })),
    sendIndividualMessage: adminProcedure.input(z.object({ userId: z.number(), message: z.string() })).mutation(async () => ({ success: true })),
  }),

  reports: router({
    getDonationReport: adminProcedure.query(async () => []),
    getMemberReport: adminProcedure.query(async () => []),
    getCampaignReport: adminProcedure.query(async () => []),
  }),


  qrVerification: router({
    verify: publicProcedure.input(z.object({ qrCode: z.string() })).query(async () => ({ valid: false })),
  }),
};
