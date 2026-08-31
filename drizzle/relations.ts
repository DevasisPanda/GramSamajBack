import { relations } from "drizzle-orm";
import { 
  users, 
  members, 
  donations, 
  campaigns, 
  campaignVolunteers,
  idCards,
  certificates,
  appointmentLetters,
  internships,
  internshipApplications,
  messages,
  bulkMessageRecipients,
  paymentTransactions
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  members: many(members),
  donations: many(donations),
  createdCampaigns: many(campaigns),
  volunteerApplications: many(campaignVolunteers),
  certificatesReceived: many(certificates, { relationName: "recipient" }),
  certificatesIssued: many(certificates, { relationName: "issuer" }),
  appointmentLettersReceived: many(appointmentLetters, { relationName: "recipient" }),
  appointmentLettersIssued: many(appointmentLetters, { relationName: "issuer" }),
  internshipsCreated: many(internships),
  internshipApplications: many(internshipApplications),
  messagesSent: many(messages, { relationName: "sender" }),
  messagesReceived: many(messages, { relationName: "recipient" }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  referredByUser: one(users, {
    fields: [members.referredBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [members.approvedBy],
    references: [users.id],
  }),
  idCards: many(idCards),
}));

export const idCardsRelations = relations(idCards, ({ one }) => ({
  member: one(members, {
    fields: [idCards.memberId],
    references: [members.id],
  }),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  donor: one(users, {
    fields: [donations.donorId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [donations.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  donations: many(donations),
  volunteers: many(campaignVolunteers),
}));

export const campaignVolunteersRelations = relations(campaignVolunteers, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignVolunteers.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [campaignVolunteers.userId],
    references: [users.id],
  }),
}));

export const internshipsRelations = relations(internships, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [internships.createdBy],
    references: [users.id],
  }),
  applications: many(internshipApplications),
}));

export const internshipApplicationsRelations = relations(internshipApplications, ({ one }) => ({
  internship: one(internships, {
    fields: [internshipApplications.internshipId],
    references: [internships.id],
  }),
  user: one(users, {
    fields: [internshipApplications.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "recipient"
  }),
  bulkRecipients: many(bulkMessageRecipients),
}));

export const bulkMessageRecipientsRelations = relations(bulkMessageRecipients, ({ one }) => ({
  message: one(messages, {
    fields: [bulkMessageRecipients.messageId],
    references: [messages.id],
  }),
  recipient: one(users, {
    fields: [bulkMessageRecipients.recipientId],
    references: [users.id],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  recipient: one(users, {
    fields: [certificates.recipientId],
    references: [users.id],
    relationName: "recipient"
  }),
  issuedBy: one(users, {
    fields: [certificates.issuedBy],
    references: [users.id],
    relationName: "issuer"
  }),
}));

export const appointmentLettersRelations = relations(appointmentLetters, ({ one }) => ({
  recipient: one(users, {
    fields: [appointmentLetters.recipientId],
    references: [users.id],
    relationName: "recipient"
  }),
  issuedBy: one(users, {
    fields: [appointmentLetters.issuedBy],
    references: [users.id],
    relationName: "issuer"
  }),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  donation: one(donations, {
    fields: [paymentTransactions.donationId],
    references: [donations.id],
  }),
  campaign: one(campaigns, {
    fields: [paymentTransactions.campaignId],
    references: [campaigns.id],
  }),
}));
