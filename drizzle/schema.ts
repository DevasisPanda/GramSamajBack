import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  datetime,
  json,
  longtext,
  uniqueIndex,
  index,
  date
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with NGO-specific fields for membership and roles.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "staff", "volunteer"]).default("user").notNull(),
  isSystemAdmin: boolean("isSystemAdmin").default(false).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "blocked", "pending"]).default("pending").notNull(),
  membershipType: varchar("membershipType", { length: 50 }),
  profileImage: text("profileImage"),
  bio: text("bio"),
  fatherName: varchar("fatherName", { length: 255 }),
  dob: date("dob"),
  aadharNumber: varchar("aadharNumber", { length: 255 }),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  maritalStatus: mysqlEnum("maritalStatus", ["single", "married", "divorced", "widowed"]),
  category: mysqlEnum("category", ["General", "OBC", "SC", "ST", "Other"]),
  bloodGroup: varchar("bloodGroup", { length: 10 }),
  occupation: varchar("occupation", { length: 255 }),
  address: text("address"),
  pinCode: varchar("pinCode", { length: 20 }),
  state: varchar("state", { length: 100 }),
  city: varchar("city", { length: 100 }),
  designation: varchar("designation", { length: 255 }),
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  tokenGeneration: int("tokenGeneration").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  statusIdx: index("status_idx").on(table.status),
  roleIdx: index("role_idx").on(table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Membership Management
 */
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  membershipNumber: varchar("membershipNumber", { length: 50 }).notNull().unique(),
  membershipType: mysqlEnum("membershipType", ["regular", "lifetime"]).default("regular").notNull(),
  status: mysqlEnum("status", ["pending", "active", "inactive", "expired", "rejected"]).default("pending").notNull(),
  joinDate: timestamp("joinDate").defaultNow().notNull(),
  renewalDate: timestamp("renewalDate"),
  expiryDate: timestamp("expiryDate"),
  referralCode: varchar("referralCode", { length: 50 }).unique(),
  referredBy: int("referredBy"),
  approvedBy: int("approvedBy"),
  approvalDate: timestamp("approvalDate"),
  notes: text("notes"),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "paid", "exempted"]).default("unpaid").notNull(),
  paymentTxnId: varchar("paymentTxnId", { length: 255 }),
  amountPaid: varchar("amountPaid", { length: 50 }),
  paymentType: mysqlEnum("paymentType", ["lifetime_one_time", "yearly_subscription", "admin_exempted"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("members_userId_idx").on(table.userId),
  statusIdx: index("members_status_idx").on(table.status),
  membershipNumberIdx: uniqueIndex("membershipNumber_idx").on(table.membershipNumber),
}));

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

/**
 * ID Card Management
 */
export const idCards = mysqlTable("idCards", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  cardNumber: varchar("cardNumber", { length: 50 }).notNull().unique(),
  qrCode: text("qrCode"), // QR code data/URL
  cardImage: text("cardImage"), // S3 URL
  issueDate: timestamp("issueDate").defaultNow().notNull(),
  expiryDate: timestamp("expiryDate"),
  status: mysqlEnum("status", ["active", "expired", "revoked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  memberIdIdx: index("idCards_memberId_idx").on(table.memberId),
  cardNumberIdx: uniqueIndex("cardNumber_idx").on(table.cardNumber),
}));

export type IdCard = typeof idCards.$inferSelect;
export type InsertIdCard = typeof idCards.$inferInsert;

/**
 * Certificate Management
 */
export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(), // userId or memberId
  certificateType: mysqlEnum("certificateType", ["membership", "achievement", "visitor", "volunteer"]).notNull(),
  certificateNumber: varchar("certificateNumber", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  issueDate: timestamp("issueDate").defaultNow().notNull(),
  expiryDate: timestamp("expiryDate"),
  qrCode: text("qrCode"),
  certificateImage: text("certificateImage"), // S3 URL
  templateId: int("templateId"),
  issuedBy: int("issuedBy"),
  status: mysqlEnum("status", ["active", "expired", "revoked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  recipientIdIdx: index("certificates_recipientId_idx").on(table.recipientId),
  certificateTypeIdx: index("certificateType_idx").on(table.certificateType),
  certificateNumberIdx: uniqueIndex("certificateNumber_idx").on(table.certificateNumber),
}));

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

/**
 * Certificate Templates
 */
export const certificateTemplates = mysqlTable("certificateTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  templateImage: text("templateImage"), // S3 URL
  designJson: json("designJson"), // Template design data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CertificateTemplate = typeof certificateTemplates.$inferSelect;
export type InsertCertificateTemplate = typeof certificateTemplates.$inferInsert;

/**
 * Appointment Letters
 */
export const appointmentLetters = mysqlTable("appointmentLetters", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  letterNumber: varchar("letterNumber", { length: 50 }).notNull().unique(),
  position: varchar("position", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }),
  appointmentDate: timestamp("appointmentDate").notNull(),
  letterContent: longtext("letterContent"),
  qrCode: text("qrCode"),
  pdfUrl: text("pdfUrl"), // S3 URL
  issuedBy: int("issuedBy"),
  emailSent: boolean("emailSent").default(false),
  emailSentAt: timestamp("emailSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  recipientIdIdx: index("appointmentLetters_recipientId_idx").on(table.recipientId),
  letterNumberIdx: uniqueIndex("letterNumber_idx").on(table.letterNumber),
}));

export type AppointmentLetter = typeof appointmentLetters.$inferSelect;
export type InsertAppointmentLetter = typeof appointmentLetters.$inferInsert;

/**
 * Donations
 */
export const donations = mysqlTable("donations", {
  id: int("id").autoincrement().primaryKey(),
  donorId: int("donorId"), // nullable for anonymous donations
  donorName: varchar("donorName", { length: 255 }),
  donorEmail: varchar("donorEmail", { length: 320 }),
  donorPhone: varchar("donorPhone", { length: 20 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  donationType: mysqlEnum("donationType", ["online", "cash", "check", "transfer"]).default("online").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  transactionId: varchar("transactionId", { length: 100 }).unique(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  purpose: varchar("purpose", { length: 255 }),
  campaignId: int("campaignId"),
  beneficiaryId: int("beneficiaryId"),
  receiptNumber: varchar("receiptNumber", { length: 50 }).unique(),
  receiptUrl: text("receiptUrl"), // S3 URL
  paymentProof: text("paymentProof"), // Cloudinary URL for cheque/cash slip
  receiptSent: boolean("receiptSent").default(false),
  receiptSentAt: timestamp("receiptSentAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  donorIdIdx: index("donations_donorId_idx").on(table.donorId),
  paymentStatusIdx: index("paymentStatus_idx").on(table.paymentStatus),
  campaignIdIdx: index("donations_campaignId_idx").on(table.campaignId),
  transactionIdIdx: index("transactionId_idx").on(table.transactionId),
}));

export type Donation = typeof donations.$inferSelect;
export type InsertDonation = typeof donations.$inferInsert;

/**
 * Crowdfunding Campaigns
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: longtext("description"),
  whyNeeded: text("whyNeeded"),
  forWhom: text("forWhom"),
  impact: text("impact"),
  campaignType: mysqlEnum("campaignType", ["donation", "volunteer"]).default("donation").notNull(),
  goalAmount: decimal("goalAmount", { precision: 12, scale: 2 }).notNull(),
  targetVolunteers: int("targetVolunteers"),
  raisedAmount: decimal("raisedAmount", { precision: 12, scale: 2 }).default("0"),
  campaignImage: text("campaignImage"), // S3 URL
  projectId: int("projectId"),
  presetTiers: json("presetTiers"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed", "cancelled"]).default("draft").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("campaigns_status_idx").on(table.status),
  createdByIdx: index("campaigns_createdBy_idx").on(table.createdBy),
  endDateIdx: index("campaigns_endDate_idx").on(table.endDate),
}));

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Campaign Volunteers
 */
export const campaignVolunteers = mysqlTable("campaignVolunteers", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "completed"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  campaignIdIdx: index("campaignVolunteers_campaignId_idx").on(table.campaignId),
  userIdIdx: index("campaignVolunteers_userId_idx").on(table.userId),
}));

export type CampaignVolunteer = typeof campaignVolunteers.$inferSelect;
export type InsertCampaignVolunteer = typeof campaignVolunteers.$inferInsert;

/**
 * Beneficiaries
 */
export const beneficiaries = mysqlTable("beneficiaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // member who submitted the request
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  category: mysqlEnum("category", ["education", "health", "livelihood", "emergency", "other"]).notNull(),
  status: mysqlEnum("status", ["pending", "active", "inactive", "completed", "rejected"]).default("pending").notNull(),
  requestedAmount: decimal("requestedAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  collectedAmount: decimal("collectedAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  targetEmail: varchar("targetEmail", { length: 320 }),
  executionPlan: text("executionPlan"),
  profileImage: text("profileImage"), // S3 URL
  notes: longtext("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("beneficiaries_category_idx").on(table.category),
  statusIdx: index("beneficiaries_status_idx").on(table.status),
}));

export type Beneficiary = typeof beneficiaries.$inferSelect;
export type InsertBeneficiary = typeof beneficiaries.$inferInsert;

/**
 * Assistance Records
 */
export const assistanceRecords = mysqlTable("assistanceRecords", {
  id: int("id").autoincrement().primaryKey(),
  beneficiaryId: int("beneficiaryId").notNull(),
  assistanceType: varchar("assistanceType", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  description: longtext("description"),
  date: timestamp("date").defaultNow().notNull(),
  providedBy: int("providedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  beneficiaryIdIdx: index("assistanceRecords_beneficiaryId_idx").on(table.beneficiaryId),
}));

export type AssistanceRecord = typeof assistanceRecords.$inferSelect;
export type InsertAssistanceRecord = typeof assistanceRecords.$inferInsert;

/**
 * News & Updates
 */
export const news = mysqlTable("news", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: longtext("content").notNull(),
  featuredImage: text("featuredImage"), // S3 URL
  slug: varchar("slug", { length: 255 }).unique(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("news_status_idx").on(table.status),
  slugIdx: index("news_slug_idx").on(table.slug),
}));

export type News = typeof news.$inferSelect;
export type InsertNews = typeof news.$inferInsert;

/**
 * Activities
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: longtext("description"),
  activityDate: timestamp("activityDate").notNull(),
  location: varchar("location", { length: 255 }),
  status: mysqlEnum("status", ["planned", "ongoing", "completed", "cancelled"]).default("planned").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("activities_status_idx").on(table.status),
}));

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * Activity Photos
 */
export const activityPhotos = mysqlTable("activityPhotos", {
  id: int("id").autoincrement().primaryKey(),
  activityId: int("activityId").notNull(),
  photoUrl: text("photoUrl").notNull(), // S3 URL
  caption: text("caption"),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  activityIdIdx: index("activityPhotos_activityId_idx").on(table.activityId),
}));

export type ActivityPhoto = typeof activityPhotos.$inferSelect;
export type InsertActivityPhoto = typeof activityPhotos.$inferInsert;

/**
 * Messages (Communication System)
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId"),
  messageType: mysqlEnum("messageType", ["individual", "bulk", "notification"]).default("individual").notNull(),
  subject: varchar("subject", { length: 255 }),
  content: longtext("content").notNull(),
  channel: mysqlEnum("channel", ["in_app", "email", "sms"]).default("in_app").notNull(),
  status: mysqlEnum("status", ["draft", "sent", "failed", "read"]).default("draft").notNull(),
  sentAt: timestamp("sentAt"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  senderIdIdx: index("messages_senderId_idx").on(table.senderId),
  recipientIdIdx: index("messages_recipientId_idx").on(table.recipientId),
  statusIdx: index("messages_status_idx").on(table.status),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Bulk Message Recipients
 */
export const bulkMessageRecipients = mysqlTable("bulkMessageRecipients", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  recipientId: int("recipientId").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "read"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index("bulkMessageRecipients_messageId_idx").on(table.messageId),
  recipientIdIdx: index("bulkMessageRecipients_recipientId_idx").on(table.recipientId),
}));

export type BulkMessageRecipient = typeof bulkMessageRecipients.$inferSelect;
export type InsertBulkMessageRecipient = typeof bulkMessageRecipients.$inferInsert;

/**
 * Birthday Wishes
 */
export const birthdayWishes = mysqlTable("birthdayWishes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  birthDate: datetime("birthDate").notNull(),
  wishSent: boolean("wishSent").default(false),
  lastWishSentAt: timestamp("lastWishSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("birthdayWishes_userId_idx").on(table.userId),
}));

export type BirthdayWish = typeof birthdayWishes.$inferSelect;
export type InsertBirthdayWish = typeof birthdayWishes.$inferInsert;

/**
 * Receipts
 */
export const receipts = mysqlTable("receipts", {
  id: int("id").autoincrement().primaryKey(),
  receiptNumber: varchar("receiptNumber", { length: 50 }).notNull().unique(),
  receiptType: mysqlEnum("receiptType", ["membership", "donation", "other"]).notNull(),
  relatedId: int("relatedId"), // memberId or donationId
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  pdfUrl: text("pdfUrl"), // S3 URL
  emailSent: boolean("emailSent").default(false),
  emailSentAt: timestamp("emailSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  receiptNumberIdx: uniqueIndex("receiptNumber_idx").on(table.receiptNumber),
  receiptTypeIdx: index("receiptType_idx").on(table.receiptType),
}));

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;

/**
 * Website Pages
 */
export const websitePages = mysqlTable("websitePages", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: longtext("content"),
  pageType: mysqlEnum("pageType", ["about", "contact", "gallery", "events", "notice", "custom"]).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex("websitePages_slug_idx").on(table.slug),
  statusIdx: index("websitePages_status_idx").on(table.status),
}));

export type WebsitePage = typeof websitePages.$inferSelect;
export type InsertWebsitePage = typeof websitePages.$inferInsert;

/**
 * Events
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: longtext("description"),
  eventDate: timestamp("eventDate").notNull(),
  location: varchar("location", { length: 255 }),
  eventImage: text("eventImage"), // S3 URL
  status: mysqlEnum("status", ["upcoming", "ongoing", "completed", "cancelled"]).default("upcoming").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("events_status_idx").on(table.status),
}));

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Gallery
 */
export const gallery = mysqlTable("gallery", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl").notNull(), // S3 URL
  mediaType: mysqlEnum("mediaType", ["image", "video"]).default("image").notNull(),
  redirectUrl: varchar("redirectUrl", { length: 500 }),
  category: varchar("category", { length: 100 }),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("gallery_category_idx").on(table.category),
}));

export type Gallery = typeof gallery.$inferSelect;
export type InsertGallery = typeof gallery.$inferInsert;

/**
 * Social Media Links
 */
export const socialMediaLinks = mysqlTable("socialMediaLinks", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialMediaLink = typeof socialMediaLinks.$inferSelect;
export type InsertSocialMediaLink = typeof socialMediaLinks.$inferInsert;

/**
 * Payment Transactions (Razorpay / PhonePe Integration)
 * Tracks the lifecycle of a payment from initiation through callback verification.
 */
export const paymentTransactions = mysqlTable("paymentTransactions", {
  id: int("id").autoincrement().primaryKey(),
  transactionId: varchar("transactionId", { length: 100 }).notNull().unique(),
  donationId: int("donationId"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["initiated", "pending", "completed", "failed", "cancelled"]).default("initiated").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  // PhonePe-specific
  phonepeOrderId: varchar("phonepeOrderId", { length: 100 }),
  phonepeTransactionId: varchar("phonepeTransactionId", { length: 100 }),
  // Razorpay-specific
  razorpayOrderId: varchar("razorpayOrderId", { length: 100 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 100 }),
  razorpaySignature: varchar("razorpaySignature", { length: 255 }),
  // Donor info captured at order creation (used after successful payment)
  donorName: varchar("donorName", { length: 255 }),
  donorEmail: varchar("donorEmail", { length: 320 }),
  donorPhone: varchar("donorPhone", { length: 20 }),
  donorId: int("donorId"),
  purpose: varchar("purpose", { length: 255 }),
  campaignId: int("campaignId"),
  responseData: json("responseData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  transactionIdIdx: uniqueIndex("transactionId_idx").on(table.transactionId),
  donationIdIdx: index("paymentTransactions_donationId_idx").on(table.donationId),
  statusIdx: index("paymentTransactions_status_idx").on(table.status),
  razorpayOrderIdIdx: index("razorpayOrderId_idx").on(table.razorpayOrderId),
}));

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

/**
 * Audit Logs
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId"),
  changes: json("changes"),
  ipAddress: varchar("ipAddress", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("auditLogs_userId_idx").on(table.userId),
  entityTypeIdx: index("auditLogs_entityType_idx").on(table.entityType),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Internships
 */
export const internships = mysqlTable("internships", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }),
  description: longtext("description").notNull(),
  image: text("image"), // S3/Cloudinary URL
  requirements: longtext("requirements"),
  duration: varchar("duration", { length: 100 }), // e.g. "3 Months", "6 Months"
  location: varchar("location", { length: 255 }),
  type: mysqlEnum("type", ["remote", "onsite", "hybrid"]).default("remote").notNull(),
  status: mysqlEnum("status", ["open", "closed", "draft"]).default("open").notNull(),
  applicationDeadline: timestamp("applicationDeadline"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("internships_status_idx").on(table.status),
}));

export type Internship = typeof internships.$inferSelect;
export type InsertInternship = typeof internships.$inferInsert;

/**
 * Internship Applications
 */
export const internshipApplications = mysqlTable("internshipApplications", {
  id: int("id").autoincrement().primaryKey(),
  internshipId: int("internshipId").notNull(),
  userId: int("userId"), // Nullable if guests can apply
  applicantName: varchar("applicantName", { length: 255 }).notNull(),
  applicantEmail: varchar("applicantEmail", { length: 320 }).notNull(),
  applicantPhone: varchar("applicantPhone", { length: 20 }),
  educationBackground: text("educationBackground"),
  coverLetter: longtext("coverLetter"),
  resumeUrl: text("resumeUrl"), // S3 URL
  status: mysqlEnum("status", ["pending", "reviewed", "interviewing", "accepted", "rejected"]).default("pending").notNull(),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  internshipIdIdx: index("internshipApplications_internshipId_idx").on(table.internshipId),
  statusIdx: index("internshipApplications_status_idx").on(table.status),
}));

export type InternshipApplication = typeof internshipApplications.$inferSelect;
export type InsertInternshipApplication = typeof internshipApplications.$inferInsert;


export const enquiries = mysqlTable("enquiries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: longtext("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = typeof enquiries.$inferInsert;

/**
 * Projects
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: longtext("description"),
  image: text("image"), // Local asset path or S3 URL
  status: mysqlEnum("status", ["active", "completed", "draft"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("projects_status_idx").on(table.status),
}));

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Organization Certificates (official NGO certificates: Registration, 80G, 12A, etc.)
 */
export const organizationCertificates = mysqlTable("organization_certificates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("imageUrl").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrganizationCertificate = typeof organizationCertificates.$inferSelect;
export type InsertOrganizationCertificate = typeof organizationCertificates.$inferInsert;

/**
 * Homepage Dynamic Configurations (Hero content, Quick links, Donate for a smile campaign content)
 */
export const homepageSettings = mysqlTable("homepage_settings", {
  id: int("id").autoincrement().primaryKey(),
  heroTitle: varchar("heroTitle", { length: 255 }).default("Valmiki Samaj Charitable Trust"),
  heroDescription: text("heroDescription"),
  heroImage: text("heroImage"),
  heroImage2: text("heroImage2"),
  heroImage3: text("heroImage3"),
  heroImage4: text("heroImage4"),
  heroImage5: text("heroImage5"),
  showDonateButton: boolean("showDonateButton").default(true),
  quickLink1Text: varchar("quickLink1Text", { length: 100 }),
  quickLink1Url: varchar("quickLink1Url", { length: 255 }),
  quickLink2Text: varchar("quickLink2Text", { length: 100 }),
  quickLink2Url: varchar("quickLink2Url", { length: 255 }),
  quickLink3Text: varchar("quickLink3Text", { length: 100 }),
  quickLink3Url: varchar("quickLink3Url", { length: 255 }),
  quickLink4Text: varchar("quickLink4Text", { length: 100 }),
  quickLink4Url: varchar("quickLink4Url", { length: 255 }),
  donateSmileTitle: varchar("donateSmileTitle", { length: 255 }),
  donateSmileContent: text("donateSmileContent"),
  donateSmileImage: text("donateSmileImage"),
  donateSmileTitle2: varchar("donateSmileTitle2", { length: 255 }),
  donateSmileContent2: text("donateSmileContent2"),
  donateSmileImage2: text("donateSmileImage2"),
  donateSmileTitle3: varchar("donateSmileTitle3", { length: 255 }),
  donateSmileContent3: text("donateSmileContent3"),
  donateSmileImage3: text("donateSmileImage3"),
  donateSmileTitle4: varchar("donateSmileTitle4", { length: 255 }),
  donateSmileContent4: text("donateSmileContent4"),
  donateSmileImage4: text("donateSmileImage4"),
  donateSmileTitle5: varchar("donateSmileTitle5", { length: 255 }),
  donateSmileContent5: text("donateSmileContent5"),
  donateSmileImage5: text("donateSmileImage5"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HomepageSettings = typeof homepageSettings.$inferSelect;
export type InsertHomepageSettings = typeof homepageSettings.$inferInsert;

/**
 * Expenses
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseType: varchar("expenseType", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Ticker News (header announcement ticker)
 */
export const tickerNews = mysqlTable("ticker_news", {
  id: int("id").autoincrement().primaryKey(),
  text: varchar("text", { length: 500 }).notNull(),
  link: varchar("link", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TickerNews = typeof tickerNews.$inferSelect;
export type InsertTickerNews = typeof tickerNews.$inferInsert;

/**
 * About Us Page Dynamic Configurations
 */
export const aboutUsSettings = mysqlTable("about_us_settings", {
  id: int("id").autoincrement().primaryKey(),
  quote: text("quote"), // About Header Quote
  motto: varchar("motto", { length: 255 }), // Our Motto
  trustName: varchar("trustName", { length: 255 }), // Trust Identity Header
  regNo: varchar("regNo", { length: 100 }), // Registration No.
  established: varchar("established", { length: 100 }), // Established Date
  founder: varchar("founder", { length: 255 }), // Founder name & titles
  logoUrl: text("logoUrl"), // Right side image URL, defaults to "/logo.jpg"
  introParagraphs: json("introParagraphs"), // JSON array of paragraphs: { text: string, boldPrefix?: string, isBoldSecondary?: boolean }
  commitments: json("commitments"), // JSON array of focus cards: { icon: string, title: string, description: string }
  visionTitle: varchar("visionTitle", { length: 255 }), // Vision Section Title
  visionDescription: text("visionDescription"), // Vision Section Subtitle
  visionPoints: json("visionPoints"), // JSON array of strings (bullet points)
  coreValues: json("coreValues"), // JSON array of badges: { icon: string, title: string }
  promiseTitle: varchar("promiseTitle", { length: 255 }), // Promise Title
  promiseText: text("promiseText"), // Promise Quote/Text
  joinTitle: varchar("joinTitle", { length: 255 }), // Join Us Title
  joinDescription: text("joinDescription"), // Join Us Description
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AboutUsSettings = typeof aboutUsSettings.$inferSelect;
export type InsertAboutUsSettings = typeof aboutUsSettings.$inferInsert;

/**
 * Audit Reports
 */
export const auditReports = mysqlTable("audit_reports", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // Year/Title of audit
  imageUrl: text("imageUrl"), // Report image
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AuditReport = typeof auditReports.$inferSelect;
export type InsertAuditReport = typeof auditReports.$inferInsert;

/**
 * Achievements
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  imageUrl: text("imageUrl"), // Photo
  description: text("description"), // 1-2 line description
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

/**
 * Management Members (Dynamic Leadership Body)
 */
export const managementMembers = mysqlTable("management_members", {
  id: int("id").autoincrement().primaryKey(),
  displayOrder: int("displayOrder").default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  image: text("image").notNull(),
  quote: text("quote"),
  bio: text("bio"),
  points: json("points"), // JSON array of { icon: string, title: string, description: string }
  tag: varchar("tag", { length: 255 }),
  status: mysqlEnum("status", ["active", "hidden"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManagementMember = typeof managementMembers.$inferSelect;
export type InsertManagementMember = typeof managementMembers.$inferInsert;




