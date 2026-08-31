CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`activityDate` timestamp NOT NULL,
	`location` varchar(255),
	`status` enum('planned','ongoing','completed','cancelled') NOT NULL DEFAULT 'planned',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activityPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`caption` text,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointmentLetters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`letterNumber` varchar(50) NOT NULL,
	`position` varchar(255) NOT NULL,
	`department` varchar(255),
	`appointmentDate` timestamp NOT NULL,
	`letterContent` longtext,
	`qrCode` text,
	`pdfUrl` text,
	`issuedBy` int,
	`emailSent` boolean DEFAULT false,
	`emailSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointmentLetters_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointmentLetters_letterNumber_unique` UNIQUE(`letterNumber`),
	CONSTRAINT `letterNumber_idx` UNIQUE(`letterNumber`)
);
--> statement-breakpoint
CREATE TABLE `assistanceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`beneficiaryId` int NOT NULL,
	`assistanceType` varchar(255) NOT NULL,
	`amount` decimal(12,2),
	`description` longtext,
	`date` timestamp NOT NULL DEFAULT (now()),
	`providedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assistanceRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int,
	`changes` json,
	`ipAddress` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beneficiaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`category` enum('education','health','livelihood','emergency','other') NOT NULL,
	`status` enum('active','inactive','completed') NOT NULL DEFAULT 'active',
	`profileImage` text,
	`notes` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `beneficiaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `birthdayWishes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`birthDate` datetime NOT NULL,
	`wishSent` boolean DEFAULT false,
	`lastWishSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `birthdayWishes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bulkMessageRecipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`recipientId` int NOT NULL,
	`status` enum('pending','sent','failed','read') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bulkMessageRecipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`goalAmount` decimal(12,2) NOT NULL,
	`raisedAmount` decimal(12,2) DEFAULT '0',
	`campaignImage` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`status` enum('draft','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificateTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('membership','achievement','visitor','volunteer') NOT NULL,
	`templateImage` text,
	`designJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificateTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`certificateType` enum('membership','achievement','visitor','volunteer') NOT NULL,
	`certificateNumber` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`expiryDate` timestamp,
	`qrCode` text,
	`certificateImage` text,
	`templateId` int,
	`issuedBy` int,
	`status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_certificateNumber_unique` UNIQUE(`certificateNumber`),
	CONSTRAINT `certificateNumber_idx` UNIQUE(`certificateNumber`)
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`donorId` int,
	`donorName` varchar(255),
	`donorEmail` varchar(320),
	`donorPhone` varchar(20),
	`amount` decimal(12,2) NOT NULL,
	`donationType` enum('online','cash','check','transfer') NOT NULL DEFAULT 'online',
	`paymentMethod` varchar(50),
	`transactionId` varchar(100),
	`paymentStatus` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`purpose` varchar(255),
	`campaignId` int,
	`receiptNumber` varchar(50),
	`receiptUrl` text,
	`receiptSent` boolean DEFAULT false,
	`receiptSentAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `donations_id` PRIMARY KEY(`id`),
	CONSTRAINT `donations_transactionId_unique` UNIQUE(`transactionId`),
	CONSTRAINT `donations_receiptNumber_unique` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`eventDate` timestamp NOT NULL,
	`location` varchar(255),
	`eventImage` text,
	`status` enum('upcoming','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gallery` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text NOT NULL,
	`category` varchar(100),
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `idCards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`cardNumber` varchar(50) NOT NULL,
	`qrCode` text,
	`cardImage` text,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`expiryDate` timestamp,
	`status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `idCards_id` PRIMARY KEY(`id`),
	CONSTRAINT `idCards_cardNumber_unique` UNIQUE(`cardNumber`),
	CONSTRAINT `cardNumber_idx` UNIQUE(`cardNumber`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`membershipNumber` varchar(50) NOT NULL,
	`membershipType` enum('regular','lifetime','student','corporate') NOT NULL DEFAULT 'regular',
	`status` enum('pending','active','inactive','expired','rejected') NOT NULL DEFAULT 'pending',
	`joinDate` timestamp NOT NULL DEFAULT (now()),
	`renewalDate` timestamp,
	`expiryDate` timestamp,
	`referralCode` varchar(50),
	`referredBy` int,
	`approvedBy` int,
	`approvalDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_membershipNumber_unique` UNIQUE(`membershipNumber`),
	CONSTRAINT `members_referralCode_unique` UNIQUE(`referralCode`),
	CONSTRAINT `membershipNumber_idx` UNIQUE(`membershipNumber`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int,
	`messageType` enum('individual','bulk','notification') NOT NULL DEFAULT 'individual',
	`subject` varchar(255),
	`content` longtext NOT NULL,
	`channel` enum('in_app','email','sms') NOT NULL DEFAULT 'in_app',
	`status` enum('draft','sent','failed','read') NOT NULL DEFAULT 'draft',
	`sentAt` timestamp,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` longtext NOT NULL,
	`featuredImage` text,
	`slug` varchar(255),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `news_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `paymentTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` varchar(100) NOT NULL,
	`donationId` int,
	`amount` decimal(12,2) NOT NULL,
	`status` enum('initiated','pending','completed','failed','cancelled') NOT NULL DEFAULT 'initiated',
	`paymentMethod` varchar(50),
	`phonepeOrderId` varchar(100),
	`phonepeTransactionId` varchar(100),
	`responseData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentTransactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentTransactions_transactionId_unique` UNIQUE(`transactionId`),
	CONSTRAINT `transactionId_idx` UNIQUE(`transactionId`)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptNumber` varchar(50) NOT NULL,
	`receiptType` enum('membership','donation','other') NOT NULL,
	`relatedId` int,
	`amount` decimal(12,2) NOT NULL,
	`recipientName` varchar(255) NOT NULL,
	`recipientEmail` varchar(320),
	`pdfUrl` text,
	`emailSent` boolean DEFAULT false,
	`emailSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipts_receiptNumber_unique` UNIQUE(`receiptNumber`),
	CONSTRAINT `receiptNumber_idx` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
CREATE TABLE `socialMediaLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(50) NOT NULL,
	`url` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialMediaLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `websitePages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`content` longtext,
	`pageType` enum('about','contact','gallery','events','notice','custom') NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `websitePages_id` PRIMARY KEY(`id`),
	CONSTRAINT `websitePages_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `websitePages_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','staff','volunteer') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','inactive','blocked') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `profileImage` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `activities_status_idx` ON `activities` (`status`);--> statement-breakpoint
CREATE INDEX `activityPhotos_activityId_idx` ON `activityPhotos` (`activityId`);--> statement-breakpoint
CREATE INDEX `appointmentLetters_recipientId_idx` ON `appointmentLetters` (`recipientId`);--> statement-breakpoint
CREATE INDEX `assistanceRecords_beneficiaryId_idx` ON `assistanceRecords` (`beneficiaryId`);--> statement-breakpoint
CREATE INDEX `auditLogs_userId_idx` ON `auditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `auditLogs_entityType_idx` ON `auditLogs` (`entityType`);--> statement-breakpoint
CREATE INDEX `beneficiaries_category_idx` ON `beneficiaries` (`category`);--> statement-breakpoint
CREATE INDEX `beneficiaries_status_idx` ON `beneficiaries` (`status`);--> statement-breakpoint
CREATE INDEX `birthdayWishes_userId_idx` ON `birthdayWishes` (`userId`);--> statement-breakpoint
CREATE INDEX `bulkMessageRecipients_messageId_idx` ON `bulkMessageRecipients` (`messageId`);--> statement-breakpoint
CREATE INDEX `bulkMessageRecipients_recipientId_idx` ON `bulkMessageRecipients` (`recipientId`);--> statement-breakpoint
CREATE INDEX `campaigns_status_idx` ON `campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `campaigns_createdBy_idx` ON `campaigns` (`createdBy`);--> statement-breakpoint
CREATE INDEX `certificates_recipientId_idx` ON `certificates` (`recipientId`);--> statement-breakpoint
CREATE INDEX `certificateType_idx` ON `certificates` (`certificateType`);--> statement-breakpoint
CREATE INDEX `donations_donorId_idx` ON `donations` (`donorId`);--> statement-breakpoint
CREATE INDEX `paymentStatus_idx` ON `donations` (`paymentStatus`);--> statement-breakpoint
CREATE INDEX `donations_campaignId_idx` ON `donations` (`campaignId`);--> statement-breakpoint
CREATE INDEX `transactionId_idx` ON `donations` (`transactionId`);--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`);--> statement-breakpoint
CREATE INDEX `gallery_category_idx` ON `gallery` (`category`);--> statement-breakpoint
CREATE INDEX `idCards_memberId_idx` ON `idCards` (`memberId`);--> statement-breakpoint
CREATE INDEX `members_userId_idx` ON `members` (`userId`);--> statement-breakpoint
CREATE INDEX `members_status_idx` ON `members` (`status`);--> statement-breakpoint
CREATE INDEX `messages_senderId_idx` ON `messages` (`senderId`);--> statement-breakpoint
CREATE INDEX `messages_recipientId_idx` ON `messages` (`recipientId`);--> statement-breakpoint
CREATE INDEX `messages_status_idx` ON `messages` (`status`);--> statement-breakpoint
CREATE INDEX `news_status_idx` ON `news` (`status`);--> statement-breakpoint
CREATE INDEX `news_slug_idx` ON `news` (`slug`);--> statement-breakpoint
CREATE INDEX `paymentTransactions_donationId_idx` ON `paymentTransactions` (`donationId`);--> statement-breakpoint
CREATE INDEX `paymentTransactions_status_idx` ON `paymentTransactions` (`status`);--> statement-breakpoint
CREATE INDEX `receiptType_idx` ON `receipts` (`receiptType`);--> statement-breakpoint
CREATE INDEX `websitePages_status_idx` ON `websitePages` (`status`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `users` (`status`);